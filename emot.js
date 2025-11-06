emoticons['Bravo !'] = '62';
emoticons['D\u00E9sol\u00E9...'] = '63';
emoticons['Cadeau !'] = '64';

function findEmot(i) {
    for (var ii in emoticons) {
    var ic = emoticons[ii];
    if (i==ic) return ii;
    }
    return false;
   }

function checkEmot() {
    for (var i=0;i<51;i++) {
    if (!findEmot(i)) alert(i);
    }
    alert('ok');
}

moteurHTML.showMessageJoueur = function (idJoueur,message) {
    if (window.disableEmoticons) return;
    var rand = Math.random();
    if (message=="J'applaudis !") playSoundEffect ('Clap_Hands'+Math.floor(rand*5)+'.mp3',true,0.9);
    else if (message=="C'est long...") playSoundEffect ('Yawn'+(2+Math.floor(rand*2))+'.mp3',true,0.9);
    else if (message=="Je vous embrasse !") playSoundEffect ('Kiss '+Math.ceil(rand*3)+'.mp3',true,0.9);
    else if (message=="Je pleure !") playSoundEffect ('Cry_1Cut.mp3',true,0.9);
    
    if (emoticons[message] ) {
    //$('#divJoueur'+idJoueur).attr('title', message);
    var newIcon = $('<img class="emotHTML" style="opacity:0;" src="https://raw.githubusercontent.com/MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/dev/emots/Emoticon'+emoticons[message]+'.png" />')
    $('#divJoueur'+idJoueur).append(newIcon);
    
    $( newIcon ).load(function() {
    newIcon.css('margin-left',$('#divJoueur'+idJoueur).width()/2-newIcon.width()/2 );
    newIcon.css('opacity',1 );
    newIcon.animate({'margin-top':100,opacity:0},2500,function () {
    newIcon.remove();
    });
    });
   
    return;
    }
    
    if (typeof $('#divJoueur'+idJoueur).tooltip == 'undefined') return;
    if ($('#divJoueur'+idJoueur).attr('title') || $('#divJoueur'+idJoueur).attr('data-original-title')) {
    var pop = $('#divJoueur'+idJoueur).data('fifoMsgs');
    if (!pop)
    pop = [];
    if (pop.length<10)
    pop.push(message);
    $('#divJoueur'+idJoueur).data('fifoMsgs',pop);
    return;
    }
   
   
    $('#divJoueur'+idJoueur).attr('title', message);
    $('#divJoueur'+idJoueur).attr('data-placement', "bottom");
    $('#divJoueur'+idJoueur).attr('data-original-title', message)
    .tooltip().tooltip('fixTitle').mouseover();
   
    playSoundEffect ('Female Voice - Psst '+Math.ceil(Math.random()*2)+'.mp3',true,0.5);
    
    clearTimeout($('#divJoueur'+idJoueur).data('TO'));
    var to = setTimeout(function() {
    $('#divJoueur'+idJoueur).mouseout().attr('title', '').attr('data-original-title', '');
    var pop = $('#divJoueur'+idJoueur).data('fifoMsgs');
    if (pop) {
    if (pop.length>0) {
    var m2 = pop.shift();
    $('#divJoueur'+idJoueur).data('fifoMsgs',pop);
    setTimeout(function () {
    selMoteur.showMessageJoueur(idJoueur,m2);
    },200);
   
    }
    }
    }, 5000);
    $('#divJoueur'+idJoueur).data('TO', to);
}

moteurHTML2.showMessageJoueur = function (idJoueur,message) {
    if (window.disableEmoticons) return;
    
    var rand = Math.random();
    if (message=="J'applaudis !") playSoundEffect ('Clap_Hands'+Math.floor(rand*5)+'.mp3',true,0.9);
    else if (message=="C'est long...") playSoundEffect ('Yawn'+(2+Math.floor(rand*2))+'.mp3',true,0.9);
    else if (message=="Je vous embrasse !") playSoundEffect ('Kiss '+Math.ceil(rand*3)+'.mp3',true,0.9);
    else if (message=="Je pleure !") playSoundEffect ('Cry_1Cut.mp3',true,0.9);
    
    if (emoticons[message] ) {
    
    var newIcon = $('<img class="emotHTML" style="opacity:0;" src="https://raw.githubusercontent.com/MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/dev/emots/Emoticon'+emoticons[message]+'.png" />')
    $('#divJoueur'+idJoueur).append(newIcon);
    $( newIcon ).load(function() {
    newIcon.css('margin-left',$('#divJoueur'+idJoueur).width()/2-newIcon.width()/2);
    newIcon.css('opacity',1 );
    newIcon.animate({'margin-top':100,opacity:0},2500,function () {
    newIcon.remove();
    });
    });
   
    return;
    }
    if (typeof $('#divJoueur'+idJoueur).tooltip == 'undefined') return;
    if ($('#divJoueur'+idJoueur).attr('title') || $('#divJoueur'+idJoueur).attr('data-original-title')) {
    var pop = $('#divJoueur'+idJoueur).data('fifoMsgs');
    if (!pop)
    pop = [];
    if (pop.length<10)
    pop.push(message);
    $('#divJoueur'+idJoueur).data('fifoMsgs',pop);
    return;
    }
    $('#divJoueur'+idJoueur).attr('title', message);
    $('#divJoueur'+idJoueur).attr('data-placement', "bottom");
    $('#divJoueur'+idJoueur).attr('data-original-title', message)
    .tooltip().tooltip('fixTitle').mouseover();
    
    playSoundEffect ('Female Voice - Psst '+Math.ceil(Math.random()*2)+'.mp3',true,0.5);
    
    clearTimeout($('#divJoueur'+idJoueur).data('TO'));
    var to = setTimeout(function() {
    $('#divJoueur'+idJoueur).mouseout().attr('title', '').attr('data-original-title', '');
    var pop = $('#divJoueur'+idJoueur).data('fifoMsgs');
    if (pop) {
    if (pop.length>0) {
    var m2 = pop.shift();
    $('#divJoueur'+idJoueur).data('fifoMsgs',pop);
    setTimeout(function () {
    selMoteur.showMessageJoueur(idJoueur,m2);
    },200);
   
    }
    }
    }, 5000);
    $('#divJoueur'+idJoueur).data('TO', to);
}

moteurPhaser.initEngine = function (endFunc) {
    if (typeof cacheCarteHR == 'undefined') {
    setTimeout(function () {
    moteurPhaser.initEngine(endFunc);
    },1000);
    return;
    }
    for (var i in cacheCarteHR) {
    cardsShallLoad++;
    var data64 = getCardJSIMG(i);
    dataCardsPhaser[i] = new Image();
    dataCardsPhaser[i].idIT = i;
    dataCardsPhaser[i].onload = function () {
    cardsLoaded++;
    if (cardsLoaded==cardsShallLoad) {
    setTimeout(function () {
     initEngineInt(endFunc);
    },0);
    }
    //gamePhaser.cache.addImage(this.idIT,data64,dataCardsPhaser[this.idIT]);
    };
    dataCardsPhaser[i].src = data64;
   
    }
    cardsShallLoad++;
    if (typeof dosDesCartes !=='undefined')
    var data64 = imgPresJSprocess(dosDesCartes); 
    else if (typeof versoCarteHR !=='undefined')
    var data64 = imgPresJSprocess(versoCarteHR); 
    else
    var data64 = versoCarte; 
   
    dataCardsPhaser['Verso'] = new Image();
    dataCardsPhaser['Verso'].idIT = 'Verso';
    dataCardsPhaser['Verso'].onload = function () {
    cardsLoaded++;
    if (cardsLoaded==cardsShallLoad) {
    setTimeout(function () {
    initEngineInt(endFunc);
    },0);
    }
    //gamePhaser.cache.addImage(this.idIT,data64,dataCardsPhaser[this.idIT]);
    };
    dataCardsPhaser['Verso'].src = data64;
   }
   var loadingSprite;
   var currentProgress = 0;
   
   function refreshProgress() {
    if (!loadingSprite) return;
    //llog("File Complete: " + progress + "% - " + totalLoaded + " out of " + totalFiles);
    loadingSprite.text.setText(currentProgress + "%")
    //loadingSprite.masque.x--;
    loadingSprite.masque.clear();
    loadingSprite.masque.beginFill(0xffffff);
    loadingSprite.masque.drawRect(-loadingSprite.logo.width/2, -loadingSprite.logo.height/2, loadingSprite.logo.width*currentProgress/100,loadingSprite.logo.height);
    //loadingSprite.logo.mask = loadingSprite.masque;
   }