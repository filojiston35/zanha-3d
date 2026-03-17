export default {
  data: () => ({}),
  computed: {
    //RULES
    ruleList() {
      return {
        requiredFieldRule: this.requiredFieldRule,
        emailFieldRule: this.emailFieldRule,
        identityNumberFieldRule: this.identityNumberFieldRule,
        taxNumberFieldRule: this.taxNumberFieldRule,
        urlFieldRule: this.urlFieldRule,
        ipAddressFieldRule: this.ipAddressFieldRule,
        naceCodeFieldRule: this.naceCodeFieldRule,
        ibanNumberFieldRule: this.ibanNumberFieldRule,
        binNumberFieldRule: this.binNumberFieldRule,
        stringFieldRule: this.stringFieldRule,
        numberFieldRule: this.numberFieldRule,
        fileFieldRule: this.fileFieldRule,
        commissionRateField: this.commissionRateField,
      };
    },
    maskList() {
      return {
        ibanMask: this.ibanMask,
        identityNumberMask: this.identityNumberMask,
        taxNumberMask: this.taxNumberMask,
        binNumberMask: this.binNumberMask,
        cardNumberMask: this.cardNumberMask,
      };
    },
    //REQUIRED
    requiredFieldRule() {
      return [(v) => !!v || this.$t("public.this_field_required")];
    },
    //EMAIL
    emailFieldRule() {
      return [
        async (v) => {
          if (v == null || v === "") return true;

          const emailRegex = /.+@.+\..+/;
          const timeout = 750; // Maximum 750ms

          return new Promise((resolve) => {
            const timer = setTimeout(
              () => resolve(this.$t("public.invalid_email")),
              timeout,
            );

            try {
              const isValid = emailRegex.test(v);
              clearTimeout(timer);
              resolve(isValid || this.$t("public.invalid_email"));
            } catch (error) {
              console.log(error);
              clearTimeout(timer);
              resolve(this.$t("public.invalid_email"));
            }
          });
        },
      ];
    },
    //IDENTITY NUMBER
    identityNumberFieldRule() {
      return [
        (v) =>
          this.identityNumberValidation(v) ||
          this.$t("public.invalid_identity_number"),
      ];
    },
    //TAX NUMBER
    taxNumberFieldRule() {
      return [
        (v) => (v || "").length == 10 || this.$t("public.invalid_tax_number"),
      ];
    },
    //PASSWORD
    passwordFieldRule() {
      const rules = [
        {
          test: (v) => v != null && v.length >= 12,
          message: this.$t("public.password_rule"),
        },
        {
          test: (v) => /[a-z]/.test(v),
          message: this.$t("public.password_rule"),
        },
        {
          test: (v) => /[A-Z]/.test(v),
          message: this.$t("public.password_rule"),
        },
        {
          test: (v) => /\d/.test(v),
          message: this.$t("public.password_rule"),
        },
        {
          test: (v) => /[!@\\?#$%^&*()+=._-]/.test(v),
          message: this.$t("public.password_rule"),
        },
      ];

      return rules.map((rule) => (v) => rule.test(v) || rule.message);
    },
    //PASSWORD CONFIRMATION
    passwordConfirmFieldRule() {
      return [
        this.model.password === this.passwordConfirm ||
          this.$t("public.password_must_match"),
      ];
    },
    //URL
    urlFieldRule() {
      const regex =
        /^(https?:\/\/)?([\w-]+\.)*[\w-]+\.[a-zA-Z]{2,}(:\d+)?(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?(\?[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?(#[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/;
      return [
        (v) =>
          v == null ||
          v == "" ||
          regex.test(v) ||
          this.$t("public.invalid_url"),
      ];
    },
    // IP ADDRESS
    ipAddressFieldRule() {
      return [
        (v) =>
          this.ipAddressValidation(v) || this.$t("public.invalid_ipaddress"),
      ];
    },
    //NACE CODE
    naceCodeFieldRule() {
      return [
        (v) =>
          this.naceCodeValidation(v) || this.$t("public.invalid_nace_code"),
      ];
    },
    //IBAN NUMBER
    ibanNumberFieldRule() {
      return [
        (v) =>
          this.ibanNumberValidation(v) || this.$t("public.invalid_iban_number"),
      ];
    },
    //FILE
    fileFieldRule() {
      return [
        (v) => (v && v.size > 0) || this.$t("public.this_field_required"),
        (v) =>
          this.fileExtensionValidation(v) ||
          this.$t("public.invalid_file_extension"),
        (v) => (v && v.size < 25e6) || "Dosya 25mb dan fazla olamaz",
      ];
    },
    //BIN NUMBER
    binNumberFieldRule() {
      return [
        (v) =>
          this.binNumberValidation(v) || this.$t("public.invalid_bin_number"),
      ];
    },
    //STRING FIELD
    stringFieldRule() {
      return [
        (v) =>
          (!!v && /^[çıüğöşİĞÜÖŞÇA-Za-z ]+$/.test(v)) ||
          this.$t("public.special_and_numeric_character_cannot_be_used"),
      ];
    },
    //NUMBER FIELD
    numberFieldRule() {
      return [
        (v) =>
          v == null ||
          v == "" ||
          /^\d+$/.test(v) ||
          this.$t("public.only_numeric_characters"),
      ];
    },
    //COMMISSION RATE FIELD
    commissionRateField() {
      return [
        (v) =>
          (!!v && /^\d+(?:\.\d{1,2})?$/.test(v)) ||
          this.$t("public.invalid_rate"),
      ];
    },
    //PAYMENT AMOUNT FIELD
    paymentAmountField() {
      return [
        (v) =>
          (!!v && /^\d+(?:\.\d{1,2})?$/.test(v)) ||
          this.$t("public.invalid_amount"),
      ];
    },
    //WALLET CODE RULE
    walletCodeRule() {
      return [
        (v) => (v || "").length == 13 || this.$t("public.invalid_wallet_code"),
      ];
    },
    qrCodeRule() {
      return [
        (v) => (v || "").length == 6 || this.$t("public.invalid_qr_code"),
      ];
    },

    //----------------------------------------------------------------
    //MASK
    // IBAN MASK
    ibanMask() {
      return "TR #### #### #### #### #### ####";
    },
    cardNumberMask() {
      return "#### #### #### ####";
    },
    // IDENTITY NUMBER MASK
    identityNumberMask() {
      return "###########";
    },
    // TAX NUMBER MASK
    taxNumberMask() {
      return "##########";
    },
    binNumberMask() {
      return "########";
    },
  },
  methods: {
    identityNumberValidation(v) {
      if (
        v == null ||
        (v.length == 11 && v != "" && parseInt(v.slice(-1)) % 2 == 0)
      ) {
        return true;
      } else if (v == "") {
        return true;
      } else {
        return false;
      }
    },
    naceCodeValidation(v) {
      if (v.length >= 6) {
        return true;
      } else if (v == "") {
        return true;
      } else {
        return false;
      }
    },
    ibanNumberValidation(v) {
      if (v == null || (v.length == 32 && v != "")) {
        return true;
      } else if (v == "") {
        return true;
      } else {
        return false;
      }
    },
    binNumberValidation(v) {
      if (v == null || (v.length == 6 && v != "")) {
        return true;
      } else if (v == "") {
        return true;
      } else {
        return false;
      }
    },
    fileExtensionValidation(v) {
      if (!v) return false;

      const approvedFileTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
        ".csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      return approvedFileTypes.includes(v.type);
    },
  },
};
