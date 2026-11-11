package ai.voiceworld.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.inmobi.ads.AdMetaInfo;
import com.inmobi.ads.InMobiAdRequestStatus;
import com.inmobi.ads.InMobiInterstitial;
import com.inmobi.ads.listeners.InterstitialAdEventListener;
import com.inmobi.sdk.InMobiSdk;
import com.inmobi.sdk.SdkInitializationListener;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Minimal native Capacitor bridge for InMobi rewarded video ads.
 *
 * Exposes one method to JS: showRewardedVideo({accountId, placementId})
 * -> {rewarded: boolean, error?: string}
 * - Rewarded video is delivered by InMobi as an {@link InMobiInterstitial}
 *   created with the Rewarded Video placement ID; the reward is earned ONLY
 *   when InterstitialAdEventListener.onRewardsUnlocked() fires (user watched
 *   the whole video) AND the ad is then closed (onAdDismissed).
 * - Closing early, load failure, show failure or a load timeout resolve
 *   with rewarded=false (never rejects) so the JS side can fall back to AdMob.
 * - The JS side passes accountId + placementId from the Firestore settings
 *   (admin panel); the DEFAULT_* constants below are the fallback.
 *
 * API verified against the real inmobi-ads-kotlin 11.5.1 AAR (javap) and the
 * official docs (support.inmobi.com, SDK 11.5.1):
 * - InMobiSdk.init(Context, String accountId, JSONObject, SdkInitializationListener)
 *   (must run on the UI thread); InMobiSdk.isSDKInitialized()
 * - new InMobiInterstitial(Context, long placementId, InterstitialAdEventListener)
 *   (must be created on the UI thread; creating it without SDK init throws)
 * - interstitial.load() / .show() / .isReady()
 * - InterstitialAdEventListener: onAdLoadSucceeded / onAdLoadFailed /
 *   onAdDisplayFailed / onAdDismissed / onRewardsUnlocked (+ parent
 *   AdEventListener: onAdFetchSuccessful / onAdClicked / onAdImpression)
 *
 * TEST MODE: InMobi SDK 11 has NO programmatic test-mode API (verified: no
 * setTestMode / testmode symbol anywhere in the 11.5.1 AAR or on InMobiSdk).
 * Test mode is a DASHBOARD placement setting only. This code never enables
 * anything test-like, so the release build requests REAL ads by construction.
 * NOTE: the dashboard placement "Rewarded Voice Generation" (10000876375)
 * currently has Test Mode = GLOBAL (no app URL on file). Until that is turned
 * OFF in the InMobi dashboard, the SDK serves TEST ads, not real ones — that
 * is a dashboard action, not a code change.
 */
@CapacitorPlugin(name = "InMobi")
public class InMobiPlugin extends Plugin {

    // InMobi publisher account (SOMYA DHARUA / branjandharua7@gmail.com).
    static final String DEFAULT_ACCOUNT_ID = "c8f7e493ec434e38be7658540506d2fe";
    // Dashboard App Key for "VoiceWorld AI" (Android, unpublished) — a
    // dashboard identifier only; the SDK itself uses accountId + placementId.
    static final String DEFAULT_APP_KEY = "10000254308";
    // Rewarded Video placement "Rewarded Voice Generation".
    static final long DEFAULT_PLACEMENT_ID = 10000876375L;

    // If the SDK has not answered (loaded or failed) within this long, give up
    // so the JS side can fall back to AdMob instead of hanging forever.
    private static final long LOAD_TIMEOUT_MS = 75000;
    // Bounded wait for the async SDK init callback (on a background thread —
    // never blocks the UI thread).
    private static final long INIT_TIMEOUT_MS = 20000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private InMobiInterstitial currentAd;

    // One-shot SDK init state (shared across calls; init must be called once).
    private static final Object INIT_LOCK = new Object();
    private static CountDownLatch sInitLatch = null;
    private static boolean sInitOk = false;

    @PluginMethod
    public void showRewardedVideo(final PluginCall call) {
        final String accountId = optString(call, "accountId", DEFAULT_ACCOUNT_ID);
        final long placementId = optLong(call, "placementId", DEFAULT_PLACEMENT_ID);
        if (accountId == null || accountId.isEmpty() || placementId <= 0) {
            resolve(call, false, "InMobi not configured (missing account/placement id)");
            return;
        }
        // Init may block briefly waiting for its callback — do that on a
        // background thread, never on the UI thread.
        new Thread(new Runnable() {
            @Override
            public void run() {
                if (!ensureInit(accountId)) {
                    resolve(call, false, "InMobi init failed");
                    return;
                }
                final Activity activity = getActivity();
                if (activity == null) {
                    resolve(call, false, "no activity");
                    return;
                }
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        loadAndShow(call, activity, placementId);
                    }
                });
            }
        }).start();
    }

    // Calls InMobiSdk.init once (UI thread, per docs) and waits for its
    // callback. Returns true only when the SDK reports itself initialised.
    private boolean ensureInit(final String accountId) {
        if (InMobiSdk.isSDKInitialized()) {
            return true;
        }
        final CountDownLatch latch;
        synchronized (INIT_LOCK) {
            if (sInitLatch == null) {
                sInitLatch = new CountDownLatch(1);
                final Activity activity = getActivity();
                if (activity == null) {
                    sInitLatch.countDown();
                    return false;
                }
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            InMobiSdk.init(activity, accountId, null,
                                    new SdkInitializationListener() {
                                        @Override
                                        public void onInitializationComplete(
                                                @Nullable Error error) {
                                            sInitOk = (error == null);
                                            sInitLatch.countDown();
                                        }
                                    });
                        } catch (Exception e) {
                            sInitLatch.countDown();
                        }
                    }
                });
            }
            latch = sInitLatch;
        }
        try {
            latch.await(INIT_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
        return sInitOk && InMobiSdk.isSDKInitialized();
    }

    // Runs on the UI thread (InMobiInterstitial is not thread-safe).
    private void loadAndShow(final PluginCall call, final Activity activity,
                             final long placementId) {
        final AtomicBoolean settled = new AtomicBoolean(false);
        final boolean[] rewardEarned = new boolean[]{false};

        final Runnable timeout = new Runnable() {
            @Override
            public void run() {
                if (settled.compareAndSet(false, true)) {
                    currentAd = null;
                    resolve(call, false, "load timeout");
                }
            }
        };
        mainHandler.postDelayed(timeout, LOAD_TIMEOUT_MS);

        final InterstitialAdEventListener listener =
                new InterstitialAdEventListener() {
                    @Override
                    public void onAdLoadSucceeded(
                            @NonNull InMobiInterstitial ad,
                            @NonNull AdMetaInfo info) {
                        // Ad is ready — show it now.
                        try {
                            ad.show();
                        } catch (Exception e) {
                            mainHandler.removeCallbacks(timeout);
                            if (settled.compareAndSet(false, true)) {
                                currentAd = null;
                                resolve(call, false, "failed to show");
                            }
                        }
                    }

                    @Override
                    public void onAdLoadFailed(
                            @NonNull InMobiInterstitial ad,
                            @NonNull InMobiAdRequestStatus status) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            String msg = status != null ? status.getMessage() : null;
                            resolve(call, false, "failed to load"
                                    + (msg != null ? ": " + msg : ""));
                        }
                    }

                    @Override
                    public void onAdDisplayFailed(@NonNull InMobiInterstitial ad) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            resolve(call, false, "failed to display");
                        }
                    }

                    @Override
                    public void onRewardsUnlocked(
                            @NonNull InMobiInterstitial ad,
                            Map<Object, Object> rewards) {
                        rewardEarned[0] = true;
                    }

                    @Override
                    public void onAdDismissed(@NonNull InMobiInterstitial ad) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            resolve(call, rewardEarned[0],
                                    rewardEarned[0] ? null : "closed before reward");
                        }
                    }
                };

        try {
            currentAd = new InMobiInterstitial(activity, placementId, listener);
            currentAd.load();
        } catch (Exception e) {
            mainHandler.removeCallbacks(timeout);
            if (settled.compareAndSet(false, true)) {
                currentAd = null;
                resolve(call, false, "failed to create ad: " + e.getMessage());
            }
        }
    }

    private void resolve(final PluginCall call, final boolean rewarded,
                         @Nullable final String error) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                JSObject ret = new JSObject();
                ret.put("rewarded", rewarded);
                if (error != null) {
                    ret.put("error", error);
                }
                call.resolve(ret);
            }
        });
    }

    private static String optString(PluginCall call, String key, String def) {
        try {
            String v = call.getString(key);
            return (v != null && !v.isEmpty()) ? v : def;
        } catch (Exception e) {
            return def;
        }
    }

    private static long optLong(PluginCall call, String key, long def) {
        try {
            Object o = call.getData().opt(key);
            if (o instanceof Number) {
                return ((Number) o).longValue();
            }
            if (o != null) {
                return Long.parseLong(String.valueOf(o));
            }
        } catch (Exception e) {
            // fall through to default
        }
        return def;
    }
}
