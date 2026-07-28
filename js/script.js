document.addEventListener("DOMContentLoaded", function () {
  var menuToggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  var sidebarToggle = document.querySelector(".sidebar-toggle");
  var sidebarNav = document.querySelector(".sidebar-nav");

  if (sidebarToggle && sidebarNav) {
    sidebarToggle.addEventListener("click", function () {
      sidebarNav.classList.toggle("open");
    });
  }

  var faqButtons = document.querySelectorAll(".faq-question");
  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var item = button.closest(".faq-item");
      if (item) {
        item.classList.toggle("open");
      }
    });
  });

  var chatbots = document.querySelectorAll(".chatbot");
  chatbots.forEach(function (chatbot) {
    var toggle = chatbot.querySelector(".chatbot-toggle");
    var close = chatbot.querySelector(".chatbot-close");

    if (toggle) {
      toggle.addEventListener("click", function () {
        chatbot.classList.toggle("open");
      });
    }

    if (close) {
      close.addEventListener("click", function () {
        chatbot.classList.remove("open");
      });
    }
  });
});
