<template>
  <v-app theme="dark">
    <v-main class="pa-0">
      <v-container fluid class="pa-0 fill-viewport">
        <NuxtPage />
      </v-container>
    </v-main>
  </v-app>
</template>
<script>
export default {
  name: "DefaultLayout",
};
</script>

<style scoped>
.fill-viewport {
  min-height: 100vh;
}
</style>
