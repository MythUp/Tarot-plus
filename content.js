chrome.storage.local.get("enabled", (data) => {
  if (data.enabled) {
      console.log("Extension activée");

      // Fonction pour remplacer le contenu du <td>, sauf s'il contient un <input> spécifique
      const replaceTdContent = () => {
          const tdElement = document.querySelector("#chatBg td#chtput");
          if (tdElement) {
              const inputElement = tdElement.querySelector("input#chatInput");

              if (!inputElement) {
                  console.log("Élément <td> trouvé et ne contient pas <input>. Remplacement dans 0.5 seconde...");
                  setTimeout(() => {
                      if (tdElement && !tdElement.querySelector("input#chatInput")) {
                          console.log("Remplacement en cours...");
                          tdElement.innerHTML = '<img onclick="sendEmot(57);" src="/images/Emoticon/Emoticon57.png?v2" class="emotIcon"><img onclick="sendEmot(58);" src="/images/Emoticon/Emoticon58.png?v2" class="emotIcon"><img onclick="sendEmot(59);" src="/images/Emoticon/Emoticon59.png?v2" class="emotIcon"><img onclick="sendEmot(0);" src="/images/Emoticon/Emoticon0.png?v2" class="emotIcon"><img onclick="sendEmot(1);" src="/images/Emoticon/Emoticon1.png?v2" class="emotIcon"><img onclick="sendEmot(2);" src="/images/Emoticon/Emoticon2.png?v2" class="emotIcon"><img onclick="sendEmot(3);" src="/images/Emoticon/Emoticon3.png?v2" class="emotIcon"><img onclick="sendEmot(4);" src="/images/Emoticon/Emoticon4.png?v2" class="emotIcon"><img onclick="sendEmot(5);" src="/images/Emoticon/Emoticon5.png?v2" class="emotIcon"><img onclick="sendEmot(6);" src="/images/Emoticon/Emoticon6.png?v2" class="emotIcon"><img onclick="sendEmot(7);" src="/images/Emoticon/Emoticon7.png?v2" class="emotIcon"><img onclick="sendEmot(8);" src="/images/Emoticon/Emoticon8.png?v2" class="emotIcon"><img onclick="sendEmot(9);" src="/images/Emoticon/Emoticon9.png?v2" class="emotIcon"><img onclick="sendEmot(10);" src="/images/Emoticon/Emoticon10.png?v2" class="emotIcon"><img onclick="sendEmot(11);" src="/images/Emoticon/Emoticon11.png?v2" class="emotIcon"><img onclick="sendEmot(12);" src="/images/Emoticon/Emoticon12.png?v2" class="emotIcon"><img onclick="sendEmot(13);" src="/images/Emoticon/Emoticon13.png?v2" class="emotIcon"><img onclick="sendEmot(14);" src="/images/Emoticon/Emoticon14.png?v2" class="emotIcon"><img onclick="sendEmot(15);" src="/images/Emoticon/Emoticon15.png?v2" class="emotIcon"><img onclick="sendEmot(16);" src="/images/Emoticon/Emoticon16.png?v2" class="emotIcon"><img onclick="sendEmot(17);" src="/images/Emoticon/Emoticon17.png?v2" class="emotIcon"><img onclick="sendEmot(18);" src="/images/Emoticon/Emoticon18.png?v2" class="emotIcon"><img onclick="sendEmot(19);" src="/images/Emoticon/Emoticon19.png?v2" class="emotIcon"><img onclick="sendEmot(20);" src="/images/Emoticon/Emoticon20.png?v2" class="emotIcon"><img onclick="sendEmot(21);" src="/images/Emoticon/Emoticon21.png?v2" class="emotIcon"><img onclick="sendEmot(22);" src="/images/Emoticon/Emoticon22.png?v2" class="emotIcon"><img onclick="sendEmot(23);" src="/images/Emoticon/Emoticon23.png?v2" class="emotIcon"><img onclick="sendEmot(24);" src="/images/Emoticon/Emoticon24.png?v2" class="emotIcon"><img onclick="sendEmot(25);" src="/images/Emoticon/Emoticon25.png?v2" class="emotIcon"><img onclick="sendEmot(26);" src="/images/Emoticon/Emoticon26.png?v2" class="emotIcon"><img onclick="sendEmot(27);" src="/images/Emoticon/Emoticon27.png?v2" class="emotIcon"><img onclick="sendEmot(28);" src="/images/Emoticon/Emoticon28.png?v2" class="emotIcon"><img onclick="sendEmot(29);" src="/images/Emoticon/Emoticon29.png?v2" class="emotIcon"><img onclick="sendEmot(30);" src="/images/Emoticon/Emoticon30.png?v2" class="emotIcon"><img onclick="sendEmot(31);" src="/images/Emoticon/Emoticon31.png?v2" class="emotIcon"><img onclick="sendEmot(32);" src="/images/Emoticon/Emoticon32.png?v2" class="emotIcon"><img onclick="sendEmot(33);" src="/images/Emoticon/Emoticon33.png?v2" class="emotIcon"><img onclick="sendEmot(34);" src="/images/Emoticon/Emoticon34.png?v2" class="emotIcon"><img onclick="sendEmot(35);" src="/images/Emoticon/Emoticon35.png?v2" class="emotIcon"><img onclick="sendEmot(36);" src="/images/Emoticon/Emoticon36.png?v2" class="emotIcon"><img onclick="sendEmot(37);" src="/images/Emoticon/Emoticon37.png?v2" class="emotIcon"><img onclick="sendEmot(38);" src="/images/Emoticon/Emoticon38.png?v2" class="emotIcon"><img onclick="sendEmot(39);" src="/images/Emoticon/Emoticon39.png?v2" class="emotIcon"><img onclick="sendEmot(40);" src="/images/Emoticon/Emoticon40.png?v2" class="emotIcon"><img onclick="sendEmot(41);" src="/images/Emoticon/Emoticon41.png?v2" class="emotIcon"><img onclick="sendEmot(42);" src="/images/Emoticon/Emoticon42.png?v2" class="emotIcon"><img onclick="sendEmot(43);" src="/images/Emoticon/Emoticon43.png?v2" class="emotIcon"><img onclick="sendEmot(44);" src="/images/Emoticon/Emoticon44.png?v2" class="emotIcon"><img onclick="sendEmot(45);" src="/images/Emoticon/Emoticon45.png?v2" class="emotIcon"><img onclick="sendEmot(46);" src="/images/Emoticon/Emoticon46.png?v2" class="emotIcon"><img onclick="sendEmot(47);" src="/images/Emoticon/Emoticon47.png?v2" class="emotIcon"><img onclick="sendEmot(48);" src="/images/Emoticon/Emoticon48.png?v2" class="emotIcon"><img onclick="sendEmot(49);" src="/images/Emoticon/Emoticon49.png?v2" class="emotIcon"><img onclick="sendEmot(50);" src="/images/Emoticon/Emoticon50.png?v2" class="emotIcon"><img onclick="sendEmot(51);" src="/images/Emoticon/Emoticon51.png?v2" class="emotIcon"><img onclick="sendEmot(52);" src="/images/Emoticon/Emoticon52.png?v2" class="emotIcon"><img onclick="sendEmot(53);" src="/images/Emoticon/Emoticon53.png?v2" class="emotIcon"><img onclick="sendEmot(54);" src="/images/Emoticon/Emoticon54.png?v2" class="emotIcon"><img onclick="sendEmot(55);" src="/images/Emoticon/Emoticon55.png?v2" class="emotIcon"><img onclick="sendEmot(56);" src="/images/Emoticon/Emoticon56.png?v2" class="emotIcon"><img onclick="sendEmot(60);" src="/images/Emoticon/Emoticon60.png?v2" class="emotIcon"><img onclick="sendEmot(61);" src="/images/Emoticon/Emoticon61.png?v2" class="emotIcon">';
                      }
                  }, 500); // Attente de 0.5 seconde
              } else {
                  console.log("<td> contient <input>, aucun remplacement effectué.");
              }
          }
      };

      // Configurer un MutationObserver pour surveiller tout le DOM
      const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
              if (
                  mutation.type === "childList" || 
                  mutation.type === "subtree" ||
                  mutation.target.matches("#chatBg")
              ) {
                  replaceTdContent();
              }
          }
      });

      // Observer le corps du document pour surveiller tous les changements
      observer.observe(document.body, { childList: true, subtree: true });

      console.log("Observation continue activée sur le DOM.");
  } else {
      console.log("Extension désactivée.");
  }
});
