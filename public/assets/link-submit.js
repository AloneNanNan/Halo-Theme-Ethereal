(function () {
  // ====== API 基础路径 ======
  var API_BASE = "/apis/anonymous.link.submit.kunkunyu.com/v1alpha1";

  // ====== 提交频率限制 ======
  var lastSubmitTime = 0;
  var SUBMIT_COOLDOWN = 30000; // 30 秒内禁止重复提交

  // ====== 验证码 ======
  var captchaCode = "";
  function drawCaptcha() {
    var canvas = document.getElementById("link-captcha-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    captchaCode = "";
    for (var i = 0; i < 4; i++)
      captchaCode += chars[Math.floor(Math.random() * chars.length)];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--card-bg")
        .trim() || "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < 4; i++) {
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillStyle =
        "#" + Math.floor(Math.random() * 0x888888 + 0x444444).toString(16);
      ctx.save();
      ctx.translate(18 + i * 20, 24);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(captchaCode[i], -8, 6);
      ctx.restore();
    }
    for (var i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.beginPath();
      ctx.moveTo(Math.random() * 100, Math.random() * 36);
      ctx.lineTo(Math.random() * 100, Math.random() * 36);
      ctx.stroke();
    }
  }

  // 获取分组列表
  async function fetchGroups() {
    try {
      var response = await fetch(API_BASE + "/linkgroups");
      if (response.ok) {
        var data = await response.json();
        var select = document.getElementById("groupName");

        var groups = [];
        if (Array.isArray(data)) {
          groups = data;
        } else if (data.items) {
          groups = data.items;
        } else if (data.spec) {
          groups = [data];
        }

        if (select && groups.length > 0) {
          var defaultOption = select.querySelector('option[value=""]');
          if (defaultOption) defaultOption.remove();

          groups.forEach(function (item) {
            var option = document.createElement("option");
            var name = item.groupName || item.metadata?.name || item.name || "";
            var label =
              item.displayName || item.spec?.displayName || item.name || "";
            option.value = name;
            option.textContent = label;
            if (option.value) {
              select.appendChild(option);
            }
          });
        }
      }
    } catch (e) {
      // 获取分组失败，静默使用默认分组
    }
  }

  // 绑定事件
  function initLinkSubmit() {
    var form = document.getElementById("link-submit-form-actual");
    var typeRadios = document.querySelectorAll('input[name="type"]');
    var updateWrapper = document.getElementById("update-description-wrapper");

    function updateTypeStyles() {
      var typeLabels = form.querySelectorAll(".link-type-label");
      var primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      typeLabels.forEach(function (label) {
        var input = label.querySelector("input");
        if (input && input.checked) {
          label.style.backgroundColor = primaryColor;
          label.style.color = "#ffffff";
          label.style.fontWeight = "bold";
          label.style.borderColor = primaryColor;
        } else {
          label.style.backgroundColor = "";
          label.style.color = "";
          label.style.fontWeight = "";
          label.style.borderColor = "";
        }
      });
    }

    typeRadios.forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (updateWrapper) {
          updateWrapper.classList.toggle("hidden", this.value !== "update");
        }
        updateTypeStyles();
      });
    });

    updateTypeStyles();

    // 内联错误提示（替代 alert）
    var errorEl = document.getElementById("link-submit-error");
    function showError(msg) {
      if (!errorEl) {
        errorEl = document.createElement("div");
        errorEl.id = "link-submit-error";
        errorEl.className = "text-sm text-red-500 text-center mt-2 font-medium";
        var submitBtn = document.getElementById("submit-link-btn");
        if (submitBtn && submitBtn.parentNode) {
          submitBtn.parentNode.appendChild(errorEl);
        }
      }
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
    function clearError() {
      if (errorEl) errorEl.style.display = "none";
    }

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        // 频率限制检查
        var now = Date.now();
        if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
          var remaining = Math.ceil(
            (SUBMIT_COOLDOWN - (now - lastSubmitTime)) / 1000,
          );
          showError("请等待 " + remaining + " 秒后再提交");
          return;
        }

        clearError();

        var captchaInput = document.getElementById("link-captcha-input");
        if (captchaInput && captchaInput.value.toUpperCase() !== captchaCode) {
          showError("验证码错误，请重新输入");
          captchaInput.value = "";
          drawCaptcha();
          return;
        }

        var submitBtn = document.getElementById("submit-link-btn");
        var btnText = document.getElementById("submit-btn-text");
        var btnLoading = document.getElementById("submit-btn-loading");
        var successDiv = document.getElementById("link-submit-success");

        submitBtn.disabled = true;
        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");

        var formData = new FormData(form);
        var data = {
          type: formData.get("type"),
          displayName: formData.get("displayName"),
          url: formData.get("url"),
        };

        if (formData.get("logo")) data.logo = formData.get("logo");
        if (formData.get("email")) data.email = formData.get("email");
        if (formData.get("description"))
          data.description = formData.get("description");
        if (formData.get("groupName"))
          data.groupName = formData.get("groupName");
        if (formData.get("rssUrl")) data.rssUrl = formData.get("rssUrl");
        if (formData.get("updateDescription"))
          data.updateDescription = formData.get("updateDescription");

        try {
          var response = await fetch(API_BASE + "/linksubmits/-/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (response.ok) {
            lastSubmitTime = Date.now();
            form.classList.add("hidden");
            if (successDiv) {
              successDiv.classList.remove("hidden");
            }
          } else {
            var errorData = await response.json().catch(function () {
              return {};
            });
            showError(
              "提交失败：" + (errorData.message || "请检查输入信息是否正确"),
            );
          }
        } catch (err) {
          showError("提交失败：网络错误，请稍后重试");
        } finally {
          submitBtn.disabled = false;
          btnText.classList.remove("hidden");
          btnLoading.classList.add("hidden");
        }
      });
    }
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initLinkSubmit();
      fetchGroups();
    });
  } else {
    initLinkSubmit();
    fetchGroups();
  }

  var captchaCanvas = document.getElementById("link-captcha-canvas");
  if (captchaCanvas) {
    drawCaptcha();
    captchaCanvas.addEventListener("click", drawCaptcha);
  }
})();
