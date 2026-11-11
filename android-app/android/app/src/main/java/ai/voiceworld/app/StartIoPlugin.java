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
import com.startapp.sdk.adsbase.Ad;
import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.adlisteners.AdDisplayListener;
import com.startapp.sdk.adsbase.adlisteners.AdEventListener;
import com.startapp.sdk.adsbase.adlisteners.VideoListener;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Minimal native Capacitor bridge for Start.io rewarded video ads.
 *
 * Exposes one method to JS: showRewardedVideo() -> {rewarded: boolean, error?: string}
 * - Loads a rewarded video via StartAppAd.loadAd(AdMode.REWARDED_VIDEO).
 * - The reward is earned ONLY when VideoListener.onVideoCompleted() fires
 *   (user watched the whole video) AND the ad is then closed (adHidden).
 * - Closing early, load failure, show failure or a load timeout resolve
 *   with rewarded=false (never rejects) so the JS side can fall back to AdMob.
 *
 * API verified against the real inapp-sdk 5.4.0 AAR (javap):
 * - StartAppAd.loadAd(StartAppAd.AdMode, AdEventListener)
 * - StartAppAd.setVideoListener(VideoListener) / VideoListener.onVideoCompleted()
 * - StartAppAd.showAd(AdDisplayListener) -> boolean
 *   (there is NO setAdDisplayListener in 5.4.0 — the listener goes to showAd)
 * - AdDisplayListener: adHidden / adDisplayed / adClicked / adNotDisplayed
 *
 * TEST MODE IS NEVER ENABLED: this class never calls
 * StartAppSDK.setTestAdsEnabled (and no other file does either), and the SDK
 * is initialised from the AndroidManifest APPLICATION_ID meta-data, so the
 * release build serves REAL Start.io ads.
 */
@CapacitorPlugin(name = "StartIo")
public class StartIoPlugin extends Plugin {

    // If the SDK has not answered (loaded or failed) within this long, give up
    // so the JS side can fall back to AdMob instead of hanging forever.
    private static final long LOAD_TIMEOUT_MS = 75000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private StartAppAd currentAd;

    @PluginMethod
    public void showRewardedVideo(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            resolve(call, false, "no activity");
            return;
        }
        final AtomicBoolean settled = new AtomicBoolean(false);
        final boolean[] videoCompleted = new boolean[]{false};

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

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final StartAppAd rewardedAd = new StartAppAd(activity);
                currentAd = rewardedAd;

                final AdDisplayListener displayListener = new AdDisplayListener() {
                    @Override
                    public void adHidden(@NonNull Ad ad) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            resolve(call, videoCompleted[0],
                                    videoCompleted[0] ? null : "closed before reward");
                        }
                    }

                    @Override
                    public void adDisplayed(@NonNull Ad ad) {
                    }

                    @Override
                    public void adClicked(@NonNull Ad ad) {
                    }

                    @Override
                    public void adNotDisplayed(@NonNull Ad ad) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            resolve(call, false, "ad not displayed");
                        }
                    }
                };

                rewardedAd.setVideoListener(new VideoListener() {
                    @Override
                    public void onVideoCompleted() {
                        videoCompleted[0] = true;
                    }
                });

                rewardedAd.loadAd(StartAppAd.AdMode.REWARDED_VIDEO, new AdEventListener() {
                    @Override
                    public void onReceiveAd(@NonNull Ad ad) {
                        // Ad is ready — show it now. showAd() returns false when
                        // the ad cannot be displayed; then nothing else will fire,
                        // so resolve immediately instead of waiting for the timeout.
                        boolean shown = rewardedAd.showAd(displayListener);
                        if (!shown) {
                            mainHandler.removeCallbacks(timeout);
                            if (settled.compareAndSet(false, true)) {
                                currentAd = null;
                                resolve(call, false, "failed to show");
                            }
                        }
                    }

                    @Override
                    public void onFailedToReceiveAd(@Nullable Ad ad) {
                        mainHandler.removeCallbacks(timeout);
                        if (settled.compareAndSet(false, true)) {
                            currentAd = null;
                            resolve(call, false, "failed to load");
                        }
                    }
                });
            }
        });
    }

    private void resolve(final PluginCall call, final boolean rewarded, @Nullable final String error) {
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
}
