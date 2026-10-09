// Studio vidéo AL BARAKA · moteur du motion design Hyperframes.
//
// window.AB.monter(tl, PLAN) construit toute la vidéo à partir du plan préparé par
// assembler.py : sous-titres mot par mot, présentation, recettes de la bibliothèque,
// appel à l'action, barre de progression, retour au cadre du début (boucle).
// Aucune recette n'invente de position : assembler.py les calcule (visage, zones sûres).
//
// Règles Hyperframes : pas de tl.call (non joué au rendu), pas de valeurs relatives,
// tout fromTo qui cache un élément le rend visible à l'arrivée, pas d'animation de letterSpacing.
(function () {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, parent, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  const echapper = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // icône lucide (licence ISC) tracée au trait ; pathLength=1 permet de la « dessiner »
  function icone(nom, couleur) {
    const formes = (window.AB_ICONES || {})[nom] || (window.AB_ICONES || {}).etoile || [];
    const enfants = formes.map(([tag, a]) =>
      `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")} pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>`).join("");
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${enfants}</svg>`;
  }
  // légende en capitales espacées : taille calculée par assembler.py pour tenir dans la carte
  function ajuster(e, taille) {
    if (e && taille) e.style.fontSize = taille + "px";
  }
  function dessiner(tl, conteneur, t, duree = 0.6) {
    const traits = conteneur.querySelectorAll("svg > *");
    if (traits.length) tl.fromTo(traits, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: duree, ease: "power2.out", stagger: 0.06 }, t);
  }

  // ------------------------------------------------------------ sous-titres
  function sousTitres(tl, P) {
    const st = $("#st");
    const blocs = [];
    P.sousTitres.forEach((c, k) => {
      const bloc = el("div", "bloc", st);
      const petit = el("div", "petit", bloc, c.petit.map((m) => `<span class="m">${echapper(m.m)}</span>`).join(""));
      const grand = el("div", "grand", bloc, `<span class="surligne"></span><span class="texte">${echapper(c.grand)}</span>`);
      blocs.push(bloc);
      // tailles mesurées avec les vraies polices par assembler.py
      if (c.taillePetit && c.taillePetit < 64) petit.style.fontSize = c.taillePetit + "px";
      if (c.tailleGrand && c.tailleGrand < 172) grand.style.fontSize = c.tailleGrand + "px";
      // le premier sous-titre est entier dès l'image 0 (la première image sert de miniature)
      const debut = k === 0 ? 0 : Math.max(0, (c.petit[0] ? c.petit[0].t : c.tg) - 0.08);
      tl.set(bloc, { opacity: 1 }, debut);
      petit.querySelectorAll(".m").forEach((m, i) => {
        const t = k === 0 ? 0 : Math.max(0, c.petit[i].t - 0.06);
        if (t === 0) tl.set(m, { opacity: 1 }, 0);
        else if (P.style === "sobre") tl.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, t);
        else tl.fromTo(m, { opacity: 0, y: 28, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.17, ease: "power3.out" }, t);
      });
      const tg = k === 0 ? 0 : Math.max(0, c.tg - 0.05);
      if (tg === 0) tl.set(grand, { opacity: 1 }, 0);
      else if (P.style === "sobre") tl.fromTo(grand, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.14, ease: "power2.out" }, tg);
      else tl.fromTo(grand, { opacity: 0, scale: 1.5, y: 14, filter: "blur(6px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.24, ease: "back.out(2.4)" }, tg);
      if (P.style !== "sobre") tl.fromTo(grand.querySelector(".surligne"), { scaleX: 0 }, { scaleX: 1, duration: 0.26, ease: "power3.out" }, tg + 0.1);
      if (c.fin < P.duree - 0.05) tl.to(bloc, { opacity: 0, y: -20, filter: "blur(6px)", duration: 0.12, ease: "power2.in" }, Math.max(tg + 0.2, c.fin - 0.1));
    });
    return blocs;
  }

  function presentation(tl, P) {
    const p = P.presentation;
    if (!p) return;
    $("#presente .nom").textContent = p.nom;
    $("#presente .role").textContent = p.role || "";
    tl.fromTo("#presente .nom", { opacity: 0, y: 40, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, p.debut);
    if (p.role) tl.fromTo("#presente .role", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, p.debut + 0.13);
    tl.fromTo("#presente .souligne", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "expo.out" }, p.debut + 0.2);
    tl.to("#presente", { opacity: 0, y: -24, duration: 0.25, ease: "power2.in" }, p.fin);
  }

  // ------------------------------------------------------------ outils de mouvement
  function secousse(tl, t, force) {
    [[0, 12, -7], [0.04, -14, 9], [0.08, 9, -5], [0.12, -5, 3], [0.16, 0, 0]].forEach(([d, x, y]) =>
      tl.to("#scene", { x: x * force, y: y * force, duration: 0.04, ease: "none" }, t + d));
  }
  function apparaitre(tl, P, cible, t) {
    if (P.style === "sobre") tl.fromTo(cible, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, t);
    else tl.fromTo(cible, { opacity: 0, scale: 0.6, y: 40, filter: "blur(8px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.42, ease: "back.out(1.8)" }, t);
  }
  function disparaitre(tl, cible, t) {
    tl.to(cible, { opacity: 0, y: -30, filter: "blur(6px)", duration: 0.28, ease: "power2.in" }, t);
  }

  // ------------------------------------------------------------ recettes
  const R = {};

  // MOMENT FORT : un mot géant derrière l'orateur (vidéo détourée par-dessus)
  R.mot_derriere = (tl, P, e) => {
    const m = el("div", "geant", $("#derriere"), echapper(e.texte));
    // caché en partie exprès (effet de profondeur) : sa lisibilité est mesurée par assembler.py
    m.setAttribute("data-layout-allow-occlusion", "");
    m.style.top = e.top + "px";
    m.style.fontSize = e.taille + "px";
    m.style.color = e.couleur === "principale" ? "var(--principale-texte)" : e.couleur === "creme" ? "#f4ecdd" : "var(--encre)";
    const opa = e.couleur === "encre" ? 0.9 : 1;
    if (e.t <= 0.01) tl.set(m, { opacity: opa }, 0);
    else if (P.style === "energique") tl.fromTo(m, { opacity: 0, scale: 1.35 }, { opacity: opa, scale: 1, duration: 0.3, ease: "power4.out" }, e.t);
    else tl.fromTo(m, { opacity: 0, y: 60, filter: "blur(12px)" }, { opacity: opa, y: 0, filter: "blur(0px)", duration: P.style === "sobre" ? 0.8 : 0.6, ease: "power3.out" }, e.t);
    tl.to(m, { y: -24, duration: Math.max(0.3, e.fin - e.t - 0.6), ease: "none" }, e.t + 0.6);
    tl.to(m, { opacity: 0, filter: "blur(10px)", duration: 0.35, ease: "power2.in" }, e.fin - 0.35);
    if (P.style === "energique" && e.t > 0.01) secousse(tl, e.t + 0.05, 0.8);
  };

  // MOMENT FORT : la vidéo se réduit en carte, des tuiles illustrent le propos à côté
  R.carte_reduite = (tl, P, e) => {
    const gauche = e.cote !== "droite";
    const x = gauche ? 40 : 500;
    tl.fromTo("#cadre", { scale: 1, x: 0, y: 0, borderRadius: 0 }, { scale: 0.5, x, y: 200, borderRadius: 36, duration: 0.55, ease: "power3.inOut" }, e.t);
    e.tuiles.forEach((u, k) => {
      const tu = el("div", "tuile", $("#root"), `<div class="ico">${icone(u.icone, "var(--principale)")}</div><div class="legende">${echapper(u.legende)}</div>`);
      tu.style.left = (gauche ? 610 : 140) + "px";
      tu.style.top = (k === 0 ? 250 : 700) + "px";
      tu.style.color = "var(--texte)";
      ajuster(tu.querySelector(".legende"), u.tailleLegende);
      tu.querySelector(".ico").style.color = "var(--principale)";
      apparaitre(tl, P, tu, u.t);
      dessiner(tl, tu, u.t + 0.1, 0.7);
      disparaitre(tl, tu, e.fin - 0.3);
    });
    tl.to("#cadre", { scale: 1, x: 0, y: 0, borderRadius: 0, duration: 0.5, ease: "power3.inOut" }, e.fin - 0.2);
  };

  // MOMENT FORT : une ambiance qui habille tout un passage (pluie, lumière, nuit, poussière d'or)
  R.ambiance = (tl, P, e) => {
    const devant = $("#devant");
    const duree = e.fin - e.t;
    const voile = el("div", "voile " + ({ pluie: "froid", nuit: "nuit" }[e.type] || "chaud"), $("#cadre"));
    if (e.t <= 0.01) tl.set(voile, { opacity: e.type === "lumiere" ? 0.7 : 1 }, 0);
    else tl.fromTo(voile, { opacity: 0 }, { opacity: e.type === "lumiere" ? 0.7 : 1, duration: 0.6, ease: "sine.inOut" }, e.t);
    tl.to(voile, { opacity: 0, duration: 0.5, ease: "sine.inOut" }, e.fin - 0.5);
    const couche = el("div", "", devant);
    couche.style.cssText = "position:absolute;inset:0;opacity:0";
    if (e.t <= 0.01) tl.set(couche, { opacity: 1 }, 0);
    else tl.fromTo(couche, { opacity: 0 }, { opacity: 1, duration: 0.5 }, e.t);
    tl.to(couche, { opacity: 0, duration: 0.5 }, e.fin - 0.5);
    let graine = 7;
    const hasard = () => ((graine = (graine * 9301 + 49297) % 233280) / 233280);
    if (e.type === "pluie") {
      for (let k = 0; k < 70; k++) {
        const g = el("div", "goutte", couche);
        const h = 60 + hasard() * 90;
        g.style.cssText += `left:${hasard() * 1100}px;top:-200px;height:${h}px;opacity:${0.35 + hasard() * 0.5};transform:rotate(12deg)`;
        const vitesse = 0.55 + hasard() * 0.35;
        // la première chute part du milieu de sa course : il pleut déjà sur la première image
        const deja = hasard();
        tl.fromTo(g, { y: 2300 * deja, x: -420 * deja }, { y: 2300, x: -420, duration: vitesse * (1 - deja), ease: "none" }, e.t);
        for (let a = e.t + vitesse * (1 - deja); a < e.fin; a += vitesse)
          tl.fromTo(g, { y: 0, x: 0 }, { y: 2300, x: -420, duration: vitesse, ease: "none", immediateRender: false }, a);
      }
      if (e.eclat !== undefined && P.style !== "sobre") {
        tl.fromTo("#flash", { opacity: 0 }, { opacity: 0.85, duration: 0.05, ease: "none" }, e.eclat);
        tl.to("#flash", { opacity: 0, duration: 0.35, ease: "power2.out" }, e.eclat + 0.06);
        secousse(tl, e.eclat + 0.02, 1);
      }
    } else if (e.type === "lumiere") {
      const r = el("div", "rayons", couche, "<i></i><i></i><i></i><i></i><i></i>");
      r.querySelectorAll("i").forEach((i, k) => tl.set(i, { rotation: [-24, -12, 0, 12, 24][k], opacity: k % 2 ? 0.6 : 1 }, 0));
      tl.fromTo(r, { rotation: -4 }, { rotation: 4, duration: duree, ease: "sine.inOut" }, e.t);
    } else if (e.type === "nuit") {
      for (let k = 0; k < 40; k++) {
        const s = el("div", "etoile", couche);
        s.style.cssText += `left:${hasard() * 1080}px;top:${60 + hasard() * 520}px;opacity:0`;
        tl.fromTo(s, { opacity: 0 }, { opacity: 0.4 + hasard() * 0.6, duration: 0.6 + hasard(), ease: "sine.inOut" }, e.t + hasard() * 0.8);
      }
    } else {
      for (let k = 0; k < 45; k++) {
        const p = el("div", "paillette", couche);
        const taille = 3 + hasard() * 7;
        p.style.cssText += `left:${hasard() * 1080}px;top:${200 + hasard() * 1300}px;width:${taille}px;height:${taille}px;opacity:${0.3 + hasard() * 0.6}`;
        tl.fromTo(p, { y: 0, x: 0 }, { y: -160 - hasard() * 200, x: (hasard() - 0.5) * 120, duration: duree, ease: "none" }, e.t);
      }
    }
  };

  // APPUI : coup de zoom sur un mot fort
  R.punch = (tl, P, e) => {
    const f = P.style === "sobre" ? 1.05 : P.style === "energique" ? 1.16 : 1.11;
    tl.to("#scene", { scale: f, duration: P.style === "sobre" ? 0.35 : 0.12, ease: "power3.out" }, e.t);
    tl.to("#scene", { scale: 1, duration: 0.5, ease: "power2.inOut" }, e.t + 0.55);
    if (P.style !== "sobre") {
      tl.fromTo("#fuite", { opacity: 0 }, { opacity: 0.8, duration: 0.1, ease: "none" }, e.t);
      tl.to("#fuite", { opacity: 0, duration: 0.6, ease: "power2.out" }, e.t + 0.12);
    }
    if (P.style === "energique") secousse(tl, e.t, 0.6);
  };

  // APPUI : le mot clé du sous-titre est entouré à la main
  R.entoure = (tl, P, e, blocs) => {
    const bloc = blocs[e.st];
    if (!bloc) return;
    const grand = bloc.querySelector(".grand");
    grand.insertAdjacentHTML("beforeend", '<svg class="ellipse" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M6,22 C8,6 50,2 82,6 C98,9 99,28 80,34 C58,40 14,38 5,26 C2,20 10,12 22,9" fill="none" stroke="var(--principale)" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>');
    const trait = grand.querySelector("svg.ellipse path");
    trait.style.strokeWidth = "7px";
    tl.fromTo(trait, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.45, ease: "power2.inOut" }, e.t);
  };

  // APPUI : carte avec une icône animée sur un mot concret
  R.icone_carte = (tl, P, e) => {
    const c = el("div", "carte icone", $("#root"), `<div class="ico">${icone(e.icone, "var(--principale)")}</div>${e.legende ? `<div class="legende">${echapper(e.legende)}</div>` : ""}`);
    c.style.left = e.x + "px";
    c.style.top = e.y + "px";
    ajuster(c.querySelector(".legende"), e.tailleLegende);
    apparaitre(tl, P, c, e.t);
    dessiner(tl, c, e.t + 0.08, 0.6);
    disparaitre(tl, c, e.fin - 0.28);
  };

  // APPUI : liste qui se coche au fil de la parole
  R.liste = (tl, P, e) => {
    const c = el("div", "carte liste", $("#root"), `<div class="titre">${echapper(e.titre)}</div>` +
      e.points.map((p) => `<div class="point"><div class="case">${icone("coche", "var(--principale)")}</div><div>${echapper(p.texte)}</div></div>`).join(""));
    c.style.left = e.x + "px";
    c.style.top = e.y + "px";
    apparaitre(tl, P, c, e.t);
    c.querySelectorAll(".point").forEach((pt, k) => {
      const t = e.points[k].t;
      tl.fromTo(pt, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, t);
      const svg = pt.querySelector("svg");
      tl.set(svg, { opacity: 1 }, t + 0.12);
      dessiner(tl, pt, t + 0.12, 0.3);
    });
    disparaitre(tl, c, e.fin - 0.28);
  };

  // APPUI : un chiffre qui défile jusqu'à sa valeur (une étiquette par palier, sans script au rendu)
  R.compteur = (tl, P, e) => {
    const c = el("div", "carte compteur", $("#root"), `<div class="valeur" style="position:relative"></div>${e.legende ? `<div class="legende">${echapper(e.legende)}</div>` : ""}`);
    c.style.left = e.x + "px";
    c.style.top = e.y + "px";
    ajuster(c.querySelector(".legende"), e.tailleLegende);
    const zone = c.querySelector(".valeur");
    const N = 20;
    const format = (v) => (e.prefixe || "") + Math.round(v).toLocaleString("fr-FR").replace(/ /g, " ") + (e.suffixe || "");
    const paliers = [];
    for (let k = 0; k <= N; k++) {
      const v = e.valeur * (1 - Math.pow(1 - k / N, 3));
      const s = el("span", "", zone, echapper(format(v)));
      s.style.cssText = k === N ? "opacity:0" : "position:absolute;left:0;right:0;top:0;opacity:0";
      paliers.push(s);
    }
    apparaitre(tl, P, c, e.t);
    paliers.forEach((s, k) => {
      const t = e.t + 0.1 + (0.8 * k) / N;
      tl.set(s, { opacity: 1 }, t);
      if (k < N) tl.set(s, { opacity: 0 }, t + 0.8 / N);
    });
    disparaitre(tl, c, e.fin - 0.28);
  };

  // APPUI : bandeau qui défile en travers de l'écran
  R.bandeau = (tl, P, e) => {
    const b = el("div", "bandeau", $("#root"), `<div class="defile">${Array(6).fill(echapper(e.texte)).join(" · ")}</div>`);
    b.style.top = e.y + "px";
    tl.fromTo(b, { opacity: 0, x: -300 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, e.t);
    tl.fromTo(b.querySelector(".defile"), { x: 0 }, { x: -900, duration: e.fin - e.t, ease: "none" }, e.t);
    tl.to(b, { opacity: 0, duration: 0.25 }, e.fin - 0.25);
  };

  // APPUI : la caméra s'approche lentement (émotion, phrase importante)
  R.poussee = (tl, P, e) => {
    tl.to("#pousse", { scale: e.echelle || 1.07, duration: Math.max(0.5, e.fin - e.t), ease: "sine.inOut" }, e.t);
    tl.to("#pousse", { scale: 1, duration: 0.6, ease: "sine.inOut" }, e.fin);
  };

  // APPUI : flash léger au changement de partie (cahier : 0,18 s + souffle)
  R.flash = (tl, P, e) => {
    tl.fromTo("#flash", { opacity: 0 }, { opacity: 0.5, duration: 0.06, ease: "none" }, e.t);
    tl.to("#flash", { opacity: 0, duration: 0.12, ease: "power2.out" }, e.t + 0.06);
  };

  // APPUI : citation sobre (une phrase à retenir)
  R.citation = (tl, P, e) => {
    const c = el("div", "carte citation", $("#root"), `<div class="guillemet">“</div><div class="texte">${echapper(e.texte)}</div>`);
    c.style.top = e.y + "px";
    tl.fromTo(c, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, e.t);
    disparaitre(tl, c, e.fin - 0.3);
  };

  function cta(tl, P) {
    if (!P.cta) return;
    $("#cta .texte").textContent = P.cta.texte;
    $("#cta .fleche").innerHTML = icone("fleche_bas", "currentColor");
    apparaitre(tl, P, "#cta", P.cta.t);
    for (let k = 0; k < 6; k++) {
      const t = P.cta.t + 0.5 + k * 0.5;
      if (t + 0.5 > P.duree) break;
      tl.to("#cta .bouton", { scale: 1.06, duration: 0.25, ease: "sine.inOut" }, t);
      tl.to("#cta .bouton", { scale: 1, duration: 0.25, ease: "sine.inOut" }, t + 0.25);
      tl.to("#cta .fleche", { y: 10, duration: 0.25, ease: "sine.inOut" }, t);
      tl.to("#cta .fleche", { y: 0, duration: 0.25, ease: "sine.inOut" }, t + 0.25);
    }
  }

  window.AB = {
    recettes: Object.keys(R),
    monter(tl, P) {
      document.body.classList.add("style-" + P.style);
      (window.AB_ICONES || (window.AB_ICONES = {})).fleche_bas = [["path", { d: "M12 5v14" }], ["path", { d: "m19 12-7 7-7-7" }]];
      const blocs = sousTitres(tl, P);
      presentation(tl, P);
      P.elements.forEach((e) => R[e.recette] && R[e.recette](tl, P, e, blocs));
      cta(tl, P);
      if (P.progression) tl.fromTo("#progression", { scaleX: 0 }, { scaleX: 1, duration: P.duree, ease: "none" }, 0);
      if (P.style !== "sobre") tl.fromTo("#grain", { x: 0, y: 0 }, { x: -70, y: 50, duration: P.duree, ease: "steps(140)" }, 0);
      // boucle : la dernière demi-seconde revient au cadre du début
      const fin = Math.max(0, P.duree - 0.45);
      tl.to("#scene", { scale: 1, x: 0, y: 0, duration: 0.4, ease: "sine.inOut" }, fin);
      tl.to("#pousse", { scale: 1, duration: 0.4, ease: "sine.inOut" }, fin);
    },
  };
})();
