var emoticons = new Array();
emoticons[':)'] = '0';
emoticons['8)'] = '1';
emoticons['=3'] = '2';
emoticons[':-J'] = '3';
emoticons[':}'] = '4';
emoticons[';]'] = '5';
emoticons[':c'] = '6';
emoticons['XP'] = '7';
emoticons['8D'] = '8';
emoticons[':('] = '9';
emoticons[':D'] = '10';
emoticons[':\')'] = '11';
emoticons[':\'-('] = '12';
emoticons['I-O'] = '13';
emoticons[':\'('] = '14';
emoticons[':))'] = '15';
emoticons[':)))'] = '16';
emoticons[':x'] = '17';
emoticons['=\\'] = '18';
emoticons[':I'] = '19';
emoticons[':O'] = '20';
emoticons[':-,'] = '21';
emoticons[';D'] = '22';
emoticons[':..'] = '23';
emoticons['=/'] = '24';
emoticons['x)'] = '25';
emoticons['X)'] = '26';
emoticons[':['] = '27';
emoticons['8['] = '28';
emoticons['=[['] = '29';
emoticons['XO'] = '30';
emoticons['X-)'] = '31';
emoticons['=-/'] = '32';
emoticons['=II'] = '33';
emoticons[':II'] = '34';
emoticons[':P'] = '35';
emoticons[':I['] = '36';
emoticons['B)'] = '37';
emoticons['8I'] = '38';
emoticons['I)'] = '39';
emoticons['8X'] = '40';
emoticons['8-P'] = '41';
emoticons['I/'] = '42';
emoticons['B))'] = '43';
emoticons['8-I'] = '44';
emoticons['D('] = '45';
emoticons['D\'('] = '46';
emoticons['P)'] = '47';
emoticons['P))'] = '48';
emoticons['Bonjour !'] = '49';
emoticons['Bien joué !'] = '50';
emoticons['Dommage...'] = '51';
emoticons['Bonsoir'] = '52';
emoticons['Bon jeu'] = '53';
emoticons['Merci'] = '54';
emoticons['Aie'] = '55';
emoticons['Super'] = '56';
emoticons['Pas de chance'] = '57';
emoticons['J\'applaudis !'] = '58';
emoticons['C\'est long...'] = '59';
emoticons['Je vous embrasse !'] = '60';
emoticons['Je pleure !'] = '61';
emoticons['Bravo !'] = '62';
emoticons['Bye !'] = '63';
emoticons['Bof !'] = '64';
emoticons['Et toc !'] = '65';
emoticons['Hein ?'] = '66';
emoticons['Heu...'] = '67';
emoticons['Ouf'] = '68';
emoticons['Miam'] = '69';
emoticons['Non Mais !'] = '70';
emoticons['Paf !'] = '71';
emoticons['Ciao !'] = '72';
emoticons['Good'] = '73';
emoticons['Hello'] = '74';
emoticons['Hey'] = '75';
emoticons['Holà'] = '76';
emoticons['Ok'] = '77';
emoticons['Tchao'] = '78';
emoticons['Yes'] = '79';
emoticons['Désolé...'] = '80';
emoticons['Pardon'] = '81';
emoticons['Sorry'] = '82';
emoticons['Wouf !'] = '83';

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
    var newIcon = $('<img class="emotHTML" style="opacity:0;" src="https://amu11er.github.io/Emoticon'+emoticons[message]+'.png" />')
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
    
    var newIcon = $('<img class="emotHTML" style="opacity:0;" src="https://amu11er.github.io/Emoticon'+emoticons[message]+'.png" />')
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
   
   var createTextCalled = false;
   function initEngineInt(endFunc) {
    if (phaserLoadStarted) return;
    phaserLoadStarted = true;
    llog('initEngine');
    $('#webBody').html('');
   
    
    $(document.body).css('overflow','hidden');
    
    var pixRatio = 1;
    if (window.devicePixelRatio && !isLowGraphism)
    pixRatio = window.devicePixelRatio;
    
    var config = {
    "width": window.innerWidth * pixRatio,//,// * window.devicePixelRatio,//$( window ).width()-20,
    "height": window.innerHeight * pixRatio,//,// * window.devicePixelRatio,//$( window ).height()-20,
    "renderer": Phaser.AUTO,
    "parent": 'webBody',
    transparent:true,
    antialias:true,//!isLowGraphism,
    //"resolution": window.devicePixelRatio,
    "state": { preload: preloadEngine }
    };
    gamePhaser = new Phaser.Game(config);
    
    WebFontConfig = {
    //active: function() { gamePhaser.time.events.add(Phaser.Timer.SECOND, function () {} , this); },//createText
    fontactive : function(familyName, fvd) { gamePhaser.time.events.add(Phaser.Timer.SECOND, function () {
     llog('font active'+familyName+ fvd);
     if (familyName==fontNamePhaser) {
     setTimeout(createText,1000);
     }
    } , this); },//createText
    fontinactive: function(familyName, fvd) {
    llog('Err font font fontinactive'+familyName+ fvd);
     if (familyName==fontNamePhaser) {
     //errorLog('Erreur chargement police de caractere',fvd);
     }
    },
    custom: {
     families: [fontNamePhaser]
     },
    /*google: {
     families: ['Quicksand']//Roboto
    },*/
    timeout: 60000
    
    };
    function checkEventFix() {
    if (createTextCalled) return;
    if ($('html').hasClass( 'wf-active' )) {
    llog("Event fix ");
    createText();
    }
    }
   
    function checkCreateText() {
    checkEventFix();
    if (!createTextCalled) {
    //errorLog('Erreur chargement police de caractere par timeout 10',"createText not called after 20s - html class : "+$('html').attr('class') );
    createText();
    }
    }
    // This callback is sent the following parameters:
    function fileComplete(progress, cacheKey, success, totalLoaded, totalFiles) {
   
    if (phaserLoadComplete) return;
    currentProgress = progress;
    refreshProgress();
   
    }
   
   
    function loadComplete() {
    //return;
    llog("Load Complete ");
    if (!loadingSprite) return;
    //text.setText("Load Complete");
    loadingSprite.logo.destroy();
    loadingSprite.logo2.destroy();
    loadingSprite.masque.destroy();
    loadingSprite.text.destroy();
    loadingSprite = null;
    phaserLoadComplete = true;
    
    endFunc();
    }
    function createText() {
    llog('Text loaded engine init ended');
    if (createTextCalled) return;
    createTextCalled = true;
    //gamePhaser.scale.setGameSize($( window ).width() * window.devicePixelRatio, $( window ).height() * window.devicePixelRatio);
   
   
    // You can listen for each of these events from Phaser.Loader
    //gamePhaser.load.onLoadStart.add(loadStart, this);
    gamePhaser.load.onFileComplete.add(fileComplete, this);
    gamePhaser.load.onLoadComplete.add(loadComplete, this);
   
    loadingSprite = {};
    loadingSprite.logo2 = gamePhaser.add.sprite(getWorldW()/2,getWorldH()/2 , 'Logo');
    loadingSprite.logo2.anchor.setTo(0.5,0.5);
    loadingSprite.logo2.alpha=0.2;
    var scaleLogo = 1;
    if (loadingSprite.logo2.width>getWorldW()*0.9)
    scaleLogo = getWorldW()*0.9/loadingSprite.logo2.width;
    
    loadingSprite.logo2.scale.setTo(scaleLogo);
    
    loadingSprite.logo = gamePhaser.add.sprite(getWorldW()/2,getWorldH()/2 , 'Logo');
    loadingSprite.logo.anchor.setTo(0.5,0.5);
    loadingSprite.logo.scale.setTo(scaleLogo);
    
   
    loadingSprite.masque = gamePhaser.add.graphics(getWorldW()/2,getWorldH()/2);
    
    loadingSprite.masque.beginFill(0xffffff);
    loadingSprite.masque.drawRect(-loadingSprite.logo.width/2, -loadingSprite.logo.height/2, 10,loadingSprite.logo.height);
    loadingSprite.masque.anchor.setTo(0.5,0.5);
    //loadingSprite.masque.x=-loadingSprite.logo.width/2;
    loadingSprite.logo.mask = loadingSprite.masque;
    
   
    loadingSprite.text = gamePhaser.add.text(getWorldW()/2, getWorldH()/2+loadingSprite.logo.height/2, '0%', { fontSize: '36px', fill: '#fff',font: fontNamePhaser } );
    loadingSprite.text.anchor.setTo(0.5,0);
    loadingSprite.text.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
   
    $( window ).resize(function() {
    setWorldDIM();
    reorganiseCartes ("fromZomm");//
    }); 
    setWorldDIM();
    reorganiseCartes ();//
    
    loadRessources();
    
    }
    function preloadEngine() {
    setWorldDIM();
    llog('Start preloadEngine');
    gamePhaser.stage.disableVisibilityChange = true;
    gamePhaser.load.image('Logo', '/Jeu-Tarot-en-ligne/LogoHeaderSm.png');
    gamePhaser.load.script('webfont', '/js/webfont.js');
    setTimeout(checkCreateText,20000);
    setTimeout(checkEventFix,4000);
    //this._loadingBar = this.add.sprite(this.world.centerX - 100, this.world.centerY, "Logo"); 
   
    }
    function loadRessources() {
    //gamePhaser.stage.disableVisibilityChange = true;
    gamePhaser.stage.backgroundColor = 0xffffff;
   
    ///images/logo.png 
    for (var i=1;i<9;i++)
    gamePhaser.load.image('IA-'+i, '/images/IAs/IA-'+i+'.jpg');
   
    gamePhaser.load.image('FFT', '/Jeu-Tarot-en-ligne/Signalisatipon-FFT4.png');
    
    gamePhaser.load.image('Couleur1', '/images/Couleurs/PhaserB1.png');
    gamePhaser.load.image('Couleur2', '/images/Couleurs/PhaserB2.png');
    gamePhaser.load.image('Couleur3', '/images/Couleurs/PhaserB3.png');
    gamePhaser.load.image('Couleur4', '/images/Couleurs/PhaserB4.png');
   
    gamePhaser.load.image('AppelC', '/images/Couleurs/WC2.png');
    gamePhaser.load.image('AppelD', '/images/Couleurs/WD2.png');
    gamePhaser.load.image('AppelR', '/images/Couleurs/WR2.png');
    gamePhaser.load.image('AppelV', '/images/Couleurs/WV2.png');
   
    gamePhaser.load.image('Note', '/img/Jeu/Note.png');
    gamePhaser.load.image('Scotch', '/img/Jeu/Scotch.png');
    
    gamePhaser.load.image('Donneur', '/img/Jeu/Donneur.png');
    gamePhaser.load.image('TourDeJeu', '/img/Jeu/TourDeJeu.png');
    
    gamePhaser.load.image('Avat_Nobody', '/avatars/Nobody2.jpg');
    gamePhaser.load.image('Avat_Unknown', '/avatars/Unknown.jpg');
     
     
    gamePhaser.load.image('Rubans_s', '/Jeu-Tarot-en-ligne/Jeu/Rubans_s.png');
    gamePhaser.load.image('Rubans', '/Jeu-Tarot-en-ligne/Jeu/Rubans.png');
    gamePhaser.load.image('Ruban2', '/img/Jeu/Bandeau.png');
    gamePhaser.load.image('Ruban2Bot', '/img/Jeu/BandeauBot.png');
    gamePhaser.load.image('ChevronLeft', '/img/Jeu/BandeauDeco.png');
    gamePhaser.load.image('ChevronRight', '/img/Jeu/BandeauDeco2.png');
    gamePhaser.load.image('TableClassique', '/img/Jeu/Table1600x1200.png');
    
    gamePhaser.load.image('MasqueB', '/Jeu-Tarot-en-ligne/Masques/MasqueB.gif');
    gamePhaser.load.image('MasqueD', '/Jeu-Tarot-en-ligne/Masques/MasqueD.gif');
    gamePhaser.load.image('Selecteur', '/Jeu-Tarot-en-ligne/Icones/Selecteur.png');
   
    gamePhaser.load.image('LedVert', '/img/Jeu/LedVert.png');
    gamePhaser.load.image('LedRouge', '/img/Jeu/LedRouge.png');
   
    gamePhaser.load.image('ReTimerPlein', '/img/Jeu/TimerPlein.png');
    gamePhaser.load.image('ReTimerVide', '/img/Jeu/TimerVide.png');
    gamePhaser.load.image('ChatBot', '/img/Jeu/ChatBot2.png');
    gamePhaser.load.image('ChatMid', '/img/Jeu/ChatMid2.png');
    gamePhaser.load.image('ChatTop', '/img/Jeu/ChatTop2.png');
   
    gamePhaser.load.image('ChatBot3', '/img/Jeu/ChatBot3.png');
    gamePhaser.load.image('ChatMid3', '/img/Jeu/ChatMid3.png');
    gamePhaser.load.image('ChatTop3', '/img/Jeu/ChatTop3.png');
    
    for (var oo=0;oo<64;oo++)
    gamePhaser.load.image('Emoticon'+oo, 'https://amu11er.github.io/Emoticon'+oo+'.png');
   
    gamePhaser.load.image('Accessoire01', '/img/Jeu/Accessoires/Accessoire01.png');
    gamePhaser.load.image('Accessoire02', '/img/Jeu/Accessoires/Accessoire02.png');
    gamePhaser.load.image('Accessoire03', '/img/Jeu/Accessoires/Accessoire03.png');
    gamePhaser.load.image('Accessoire04', '/img/Jeu/Accessoires/Accessoire04.png');
    gamePhaser.load.image('Accessoire05', '/img/Jeu/Accessoires/Accessoire05.png');
    gamePhaser.load.image('Accessoire06', '/img/Jeu/Accessoires/Accessoire06.png');
    gamePhaser.load.image('Accessoire07', '/img/Jeu/Accessoires/Accessoire07.png');
    gamePhaser.load.image('Accessoire08', '/img/Jeu/Accessoires/Accessoire08.png');
    gamePhaser.load.image('Accessoire09', '/img/Jeu/Accessoires/Accessoire09.png');
    gamePhaser.load.image('Accessoire010', '/img/Jeu/Accessoires/Accessoire10.png');
    gamePhaser.load.image('Accessoire011', '/img/Jeu/Accessoires/Accessoire11.png');
    gamePhaser.load.image('Accessoire012', '/img/Jeu/Accessoires/Accessoire12.png');
    
    
    gamePhaser.load.image('CarteOmbre', '/img/Jeu/CarteOmbre.png');
    //gamePhaser.load.image('RoundedCorner', '/img/Jeu/RoundedCorner.png');
    
    gamePhaser.load.image('MaskRondEquipier', '/img/Jeu/MaskRondEquipier.png');
    gamePhaser.load.image('EquipierScore', '/img/Jeu/EquipierScore.png');
   
    gamePhaser.load.image('iconBigger', '/images/icones/Bigger.png');
    gamePhaser.load.image('iconClose', '/images/icones/Close.png');
    gamePhaser.load.image('iconDown', '/images/icones/down.png');
    
    gamePhaser.load.image('roleNobody', '/img/Jeu/EquipierVide2.png');
    gamePhaser.load.image('roleAnnonce', '/img/Jeu/EquipierVide2.png');
    gamePhaser.load.image('roleEquipier', '/img/Jeu/EquipierEquipier2.png');
    gamePhaser.load.image('rolePreneurPrise', '/img/Jeu/EquipierPrise2.png');
    gamePhaser.load.image('rolePreneurGarde', '/img/Jeu/EquipierGarde2.png');
    gamePhaser.load.image('rolePreneurGardesans', '/img/Jeu/EquipierGardeSans2.png');
    gamePhaser.load.image('rolePreneurGardecontre', '/img/Jeu/EquipierGardeContre2.png');
    gamePhaser.load.image('roleDefaite', '/img/Jeu/EquipierDefeat2.png');
    gamePhaser.load.image('roleVictoire', '/img/Jeu/EquipierVictory2.png');
    
    gamePhaser.load.image('ToproleNobody', '/images/icones/TopCadreVide.png');
   
    gamePhaser.load.image('btn-warning-border', '/images/Buttons/Btn_Warning_Border.png');
    gamePhaser.load.image('btn-warning-body', '/images/Buttons/Btn_Warning_Body.png');
    
    gamePhaser.load.image('btn-danger-border', '/images/Buttons/Btn_Danger_Border.png');
    gamePhaser.load.image('btn-danger-body', '/images/Buttons/Btn_Danger_Body.png');
    
    gamePhaser.load.image('btn-success-border', '/images/Buttons/Btn_Success_Border.png');
    gamePhaser.load.image('btn-success-body', '/images/Buttons/Btn_Success_Body.png');
    
    gamePhaser.load.image('btn-info-border', '/images/Buttons/Btn_Info_Border.png');
    gamePhaser.load.image('btn-info-body', '/images/Buttons/Btn_Info_Body.png');
    
    gamePhaser.load.image('TimerVide', '/images/icones/TimerVide.png');
    gamePhaser.load.image('TimerPlein', '/images/icones/TimerPlein.png');
   
   
    
    if (isLowGraphism)
    gamePhaser.load.image('Selecteur', '/Jeu-Tarot-en-ligne/Icones/SelecteurOFF.png');
    else
    gamePhaser.load.image('Selecteur', '/Jeu-Tarot-en-ligne/Icones/Selecteur.png');
    
    for (var i in cacheCarteHR) {
    var data64 = getCardJSIMG(i);
    gamePhaser.cache.addImage(i,data64,dataCardsPhaser[i]);
    }
    if (typeof dosDesCartes !=='undefined')
    var data64 = imgPresJSprocess(dosDesCartes); 
    else if (typeof versoCarteHR !=='undefined')
    var data64 = imgPresJSprocess(versoCarteHR); 
    else
    var data64 = versoCarte; 
    gamePhaser.cache.addImage('Verso',data64,dataCardsPhaser['Verso']);
    gamePhaser.load.start();
    
    }
   }