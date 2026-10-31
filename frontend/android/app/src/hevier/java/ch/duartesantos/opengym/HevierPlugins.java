package ch.duartesantos.opengym;

/**
 * The fork's native plugins, registered by one line in upstream's MainActivity (seam S17), the
 * way upstream's FlavorPlugins registers a flavour's: a plugin added or dropped changes this file,
 * never MainActivity.
 */
final class HevierPlugins {
    private HevierPlugins() {}

    static void register(MainActivity activity) {
        // The encrypted secret, the Hevy API key of the export to Hevy (D34).
        activity.registerFlavorPlugin(HevierSecretPlugin.class);
        // The home-screen month widget (D44).
        activity.registerFlavorPlugin(HevierWidgetPlugin.class);
        // The one-off position, the gym picker's "Find gyms nearby" (D47), until upstream's v1.4.3.
        activity.registerFlavorPlugin(HevierLocationPlugin.class);
        // The Bluetooth heart-rate strap, recorded while a workout runs (D79).
        activity.registerFlavorPlugin(HevierHrStrapPlugin.class);
        // The save to the gallery, a workout's share card (D87).
        activity.registerFlavorPlugin(HevierGalleryPlugin.class);
        // OpenBite's phase, read when a workout is saved (D93).
        activity.registerFlavorPlugin(HevierPhasePlugin.class);
        // The strength signal OpenBite reads (D95).
        activity.registerFlavorPlugin(HevierStrengthPlugin.class);
    }
}
