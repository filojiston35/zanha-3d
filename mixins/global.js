export default {
  data: () => {
    return {
      key: 0, //for forcerenderer
      dialog: false,
      dialogDelete: false,
      editedIndex: -1,
      statusItems: [
        { text: "Aktif", value: true },
        { text: "Pasif", value: false },
      ],
      lazyLoadingAttrs: {
        class: "mb-6",
        elevation: 2,
      },
    };
  },
  computed: {
    getComputedDialogSize() {
      return false;
    },
  },
  methods: {
    // MIXIN CLOSE DIALOG
    close() {
      this.dialog = false;
      setTimeout(() => {
        this.editedIndex = -1;
      }, 500);
    },
    // MIXIN CLOSE DELETE DIALOG
    closeDelete() {
      this.dialogDelete = false;
      this.editedIndex = -1;
    },
    // MIXIN FORMAT DATE
    formatDate(date) {
      if (!date) return null;
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year}`;
    },
    dateISOFormat(date) {
      return this.$moment(date, "YYYY-MM-DD").format("YYYY-MM-DD[T]HH:mm:ss");
    },
    //TARİH FORMATINI ZAMAN DİLİMİNE GÖRE GÜNCELLER.
    getDateWithTimeZone(time) {
      try {
        let diff = new Date().getTimezoneOffset();
        if (diff < 0) {
          diff = Math.abs(diff);
          return this.$moment(time)
            .add(diff, "minutes")
            .format("DD-MM-YYYY HH:mm");
        } else {
          return this.$moment(time)
            .subtract(diff, "minutes")
            .format("DD-MM-YYYY HH:mm");
        }
      } catch (error) {
        console.error(error);
        return "";
      }
    },
    // GLOBAL FORMAT MONEY
    formatMoney(money, currency) {
      let currencyName = currency == null ? "TRY" : currency;
      const nf = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currencyName,
      });
      return nf.format(money);
    },
    // INTEGER FORMAT
    formatNumber(number) {
      return Intl.NumberFormat("tr-TR").format(number);
    },
    //JSON OBJESINI QUERY STRINGE CEVIRIR
    jsonToQueryString(json) {
      return (
        "?" +
        Object.keys(json)
          .map(function (key) {
            if (json[key] != null) {
              return (
                encodeURIComponent(key) + "=" + encodeURIComponent(json[key])
              );
            } else {
              return "";
            }
          })
          .filter(Boolean)
          .join("&")
      );
    },
    formatDateTime() {},
    encodeSpecialCharacters(input) {
      // Eğer input false, null, undefined veya string değilse boş string döndür
      if (typeof input !== "string" || !input) {
        return input;
      }

      const specialCharacters = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return input.replace(/[&<>"']/g, function (character) {
        return specialCharacters[character];
      });
    },
    //api'nin sonucu başarılı gelirse burası çalışır
    //this.close mevcut ekran üzerindeki create/edit dialogu kapatır.
    //this.close mevcut ekran üzerindeki delete dialogu kapatır.
    //mevcut sayfa üzerindeki get all metodu çağırılır.
    apiSuccessResponse(response, isResult, resultMsg, callback) {
      //bkm için özel
      if (response?.data?.errors) {
        let errorStr = "";
        response.data.errors.forEach((element) => {
          errorStr += "|" + element.description;
        });
        this.$toastMessage("error", this.$t("toast.error_title"), errorStr);
        return false;
      }
      //bkm için özel
      else if (response?.data?.errorCode && response?.data?.moreInformation) {
        this.$toastMessage(
          "error",
          this.$t("toast.error_title"),
          response.data.moreInformation,
        );
        return false;
      }
      if (response.succeeded && response.messages.length > 0) {
        let message = resultMsg != "" ? resultMsg : response.messages.join("|");
        if (isResult) {
          this.$toastMessage(
            "success",
            this.$t("toast.success_title"),
            message,
          );
        }
        if (callback) {
          callback();
        }
      } else if (response.succeeded && response.messages.length == 0) {
        //edit işleminde sadece bilgi çektiğimiz için ekrana alert basmıyoruz.
        let message =
          resultMsg != "" ? resultMsg : "İşlem Başarıyla Gerçekleşti";
        if (isResult) {
          this.$toastMessage(
            "success",
            this.$t("toast.success_title"),
            message,
          );
        }
        if (callback) {
          callback();
        }
      }
    },
    //interceptor içerisine taşındı
    async apiErrorResponse(error) {
      console.log(error);
    },
    //toast message
    createToastMessage(type, title, msg) {
      if (type == "success") {
        this.$toastMessage("success", title, msg);
      } else {
        this.$toastMessage("error", title, msg);
      }
    },
    //automatic scroll
    goTo(id) {
      const element = document.querySelector(`#${id}`);
      const topPos = element.getBoundingClientRect().top + window.pageYOffset;

      window.scrollTo({
        top: topPos, // scroll so that the element is at the top of the view
        behavior: "smooth", // smooth scroll
      });
    },
    getShortenedText(text) {
      if (text && text.length > 20) {
        return text.slice(0, 20) + "...";
      } else {
        return text || "-";
      }
    },
    emptyStringsToNull(obj) {
      // obj'nin gerçekten bir obje olup olmadığını kontrol eder
      if (typeof obj !== "object" || obj === null) {
        return obj;
      }

      const newObj = {};
      for (const key in obj) {
        // Kendi özelliklerini (prototype chain'den gelenleri değil) kontrol eder
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (typeof obj[key] === "string" && obj[key] === "") {
            newObj[key] = null;
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      return newObj;
    },
    createDynamicFormData(dataObj = {}, extra = {}) {
      const formData = new FormData();

      // dataObj içindeki tüm key-value'ları ekle
      Object.entries(dataObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // ekstra alanlar varsa onları da ekle
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      return formData;
    },
    base64ToFile(base64, filename) {
      const arr = base64.split(",");
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new File([u8arr], filename, { type: mime });
    },
  },
};
