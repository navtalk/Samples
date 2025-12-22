import org.jetbrains.kotlin.storage.CacheResetOnProcessCanceled.enabled

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.navtalkdemo"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.navtalkdemo"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
        viewBinding = true
    }

}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
    implementation(libs.google.webrtc)
    //noinspection UseTomlInstead
    implementation("com.squareup.okhttp3:okhttp:5.0.0-alpha.2")
    //noinspection UseTomlInstead
    implementation("com.google.code.gson:gson:2.10.1")
    //noinspection UseTomlInstead
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    //noinspection UseTomlInstead
    implementation("com.github.bumptech.glide:glide:4.16.0")
    annotationProcessor(libs.compiler)
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation(libs.androidx.appcompat.v131)
    implementation(libs.androidx.constraintlayout.v211)
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation(libs.androidx.core.ktx.v160)
    //noinspection GradleDependency
    implementation("io.coil-kt:coil:2.6.0")  // Make sure Coil is included
    implementation("org.java-websocket:Java-WebSocket:1.4.0")
    implementation ("com.github.getActivity:XXPermissions:26.5")


}