package ai.voiceworld.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Explicitly register the local InMobi rewarded-video plugin BEFORE
        // super.onCreate() builds the bridge (registerPlugin adds to the
        // bridge builder; Bridge.registerPlugin dedupes by plugin id, so this
        // is safe even if annotation auto-discovery also finds the class).
        registerPlugin(InMobiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
