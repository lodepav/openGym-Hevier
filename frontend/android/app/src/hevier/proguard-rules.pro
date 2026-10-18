# [hevier] The fork's R8 rules for the release build (D50), added to upstream's by hevier.gradle (S7).
# Capacitor's consumer rules already keep each @CapacitorPlugin class and its @PluginMethod methods.

# Readable stack traces in a crash report.
-keepattributes SourceFile,LineNumberTable

# The month widget is named in the manifest; its provider and receiver are kept by aapt's rules,
# and the plugins that feed it are Capacitor plugins. Kept whole so a rename cannot break the
# snapshot the app hands over (D44).
-keep class ch.duartesantos.opengym.** { *; }

# The scanner's native code is left out (D50); its classes stay unreferenced at run time.
-dontwarn com.google.mlkit.**
