import moment from "moment-mini";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.globalProperties.$moment = moment;
});
