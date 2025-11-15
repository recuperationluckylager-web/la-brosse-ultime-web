const joueur = {
  nom: "Camille",
  pv: 30,
  pvMax: 30,
  energie: 3,
  energieMax: 3,
};

const ennemi = {
  nom: "Hacker Fantôme",
  pv: 30,
  pvMax: 30,
};

const historique = document.getElementById("historique");
const pvJoueurBarre = document.getElementById("pv-joueur");
const pvEnnemiBarre = document.getElementById("pv-ennemi");
const energieBarre = document.getElementById("energie-joueur");
const resultatDe = document.getElementById("resultat-de");
const imageDe = document.getElementById("image-de");
const actions = document.querySelectorAll("button.action");

const boutonAttaque = document.getElementById("attaque");
const boutonDrone = document.getElementById("drone");
const boutonSoin = document.getElementById("soin");
const boutonReset = document.getElementById("reset");

function genererDe(nbFaces = 6) {
  return Math.floor(Math.random() * nbFaces) + 1;
}

function afficherResultatDes(valeurs) {
  const liste = Array.isArray(valeurs) ? valeurs : [valeurs];
  if (liste.length === 1) {
    resultatDe.textContent = `Résultat du dé : ${liste[0]}`;
    imageDe.src = `assets/de-${liste[0]}.svg`;
    imageDe.alt = `Dé affichant ${liste[0]}`;
  } else {
    const total = liste.reduce((acc, val) => acc + val, 0);
    resultatDe.textContent = `Résultat des dés : ${liste.join(" + ")} = ${total}`;
    imageDe.src = "assets/de-multi.svg";
    imageDe.alt = `Deux dés affichant ${liste.join(" et ")}`;
  }
}

function lancerDe(nbFaces = 6) {
  const resultat = genererDe(nbFaces);
  afficherResultatDes(resultat);
  return resultat;
}

function lancerDeuxDes(nbFaces = 6) {
  const premier = genererDe(nbFaces);
  const second = genererDe(nbFaces);
  afficherResultatDes([premier, second]);
  return premier + second;
}

function remettreDeNeutre() {
  resultatDe.textContent = "Résultat du dé : -";
  imageDe.src = "assets/de.svg";
  imageDe.alt = "Résultat du dé";
}

function ajouterLog(message, type = "joueur") {
  const item = document.createElement("li");
  item.textContent = message;
  if (type !== "joueur") {
    item.classList.add(type);
  }
  historique.prepend(item);
}

function mettreAJourInterface() {
  pvJoueurBarre.style.width = `${(joueur.pv / joueur.pvMax) * 100}%`;
  pvJoueurBarre.setAttribute("aria-valuenow", joueur.pv);
  pvEnnemiBarre.style.width = `${(ennemi.pv / ennemi.pvMax) * 100}%`;
  pvEnnemiBarre.setAttribute("aria-valuenow", ennemi.pv);
  energieBarre.style.width = `${(joueur.energie / joueur.energieMax) * 100}%`;
  energieBarre.setAttribute("aria-valuenow", joueur.energie);

  boutonDrone.disabled = joueur.energie <= 0;
}

function verifierFin() {
  if (joueur.pv <= 0 || ennemi.pv <= 0) {
    actions.forEach((btn) => (btn.disabled = true));
    boutonReset.disabled = false;
    const gagnant = joueur.pv > 0 ? joueur.nom : ennemi.nom;
    ajouterLog(`${gagnant} remporte le duel dans les rues néon !`, "systeme");
    return true;
  }
  return false;
}

function tourEnnemi() {
  if (verifierFin()) return;

  const tirage = lancerDe();
  let message = "";
  if (tirage >= 5) {
    const degats = 5 + tirage;
    joueur.pv = Math.max(0, joueur.pv - degats);
    message = `${ennemi.nom} déclenche une surcharge quantique et inflige ${degats} dégâts !`;
  } else if (tirage >= 3) {
    const degats = 3 + tirage;
    joueur.pv = Math.max(0, joueur.pv - degats);
    message = `${ennemi.nom} lance un virus holographique et inflige ${degats} dégâts.`;
  } else {
    ennemi.pv = Math.min(ennemi.pvMax, ennemi.pv + 3);
    message = `${ennemi.nom} se dissimule dans le réseau et récupère 3 PV.`;
  }
  ajouterLog(message, "ennemi");
  mettreAJourInterface();
  verifierFin();
}

function attaqueStandard() {
  if (verifierFin()) return;
  const tirage = lancerDe();
  const degats = tirage + 3;
  ennemi.pv = Math.max(0, ennemi.pv - degats);
  ajouterLog(`${joueur.nom} frappe avec une matraque électro et inflige ${degats} dégâts.`);
  mettreAJourInterface();
  if (!verifierFin()) {
    setTimeout(tourEnnemi, 800);
  }
}

function attaqueDrone() {
  if (joueur.energie <= 0 || verifierFin()) return;
  joueur.energie -= 1;
  const tirage = lancerDeuxDes();
  const degats = tirage + 2;
  ennemi.pv = Math.max(0, ennemi.pv - degats);
  ajouterLog(`${joueur.nom} coordonne un drone furtif (2d6) et inflige ${degats} dégâts !`);
  mettreAJourInterface();
  if (!verifierFin()) {
    setTimeout(tourEnnemi, 800);
  }
}

function soinNanites() {
  if (verifierFin()) return;
  const tirage = lancerDe();
  const soin = tirage + 2;
  joueur.pv = Math.min(joueur.pvMax, joueur.pv + soin);
  joueur.energie = Math.min(joueur.energieMax, joueur.energie + 1);
  ajouterLog(`${joueur.nom} active la nanomédecine et regagne ${soin} PV (+1 énergie).`, "systeme");
  mettreAJourInterface();
  setTimeout(tourEnnemi, 800);
}

function reinitialiserPartie() {
  joueur.pv = joueur.pvMax;
  joueur.energie = joueur.energieMax;
  ennemi.pv = ennemi.pvMax;
  historique.innerHTML = "";
  ajouterLog("La mission redémarre : les néons clignotent, la pluie tombe.", "systeme");
  actions.forEach((btn) => (btn.disabled = false));
  boutonReset.disabled = false;
  remettreDeNeutre();
  mettreAJourInterface();
}

boutonAttaque.addEventListener("click", attaqueStandard);
boutonDrone.addEventListener("click", attaqueDrone);
boutonSoin.addEventListener("click", soinNanites);
boutonReset.addEventListener("click", reinitialiserPartie);

reinitialiserPartie();
