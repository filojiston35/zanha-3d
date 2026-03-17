import Vue3Toastify, { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 3000,
    position: "top-right",
    progressBar: true,
    success: "#19C0B8",
    info: "#3699FF",
    warning: "#FA8B0C",
    error: "#FF0200",
    transition: "bounceIn",
    theme: "colored",
    dangerouslyHTMLString: true,
  });

  const toastMessage = (type:any, title: string, message: string) => {
    const beautifyText = `<b>${title}</b><br/>${message}`;
    toast(beautifyText,{type:type});
  };

  return {
    provide: { toastMessage },
  };
});
