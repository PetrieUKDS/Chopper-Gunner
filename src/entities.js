'use strict';

// ---------------------------------------------------------------- drawing

// Light falls from the top-left of the screen, matching the shadows cast down-right.
const LIGHT = -Math.PI * 0.75;

// Mix a #rrggbb colour toward white (amt > 0) or black (amt < 0).
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const ch = (v) => Math.round(v + (t - v) * p);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

// Gradient for a sprite part, lit from the world light whichever way the sprite faces.
// angle is the sprite's world rotation; r is roughly the part's half-size.
function litFill(ctx, angle, r, base, flash) {
  if (flash) return '#ffffff';
  const a = LIGHT - angle, lx = Math.cos(a) * r, ly = Math.sin(a) * r;
  const g = ctx.createLinearGradient(lx, ly, -lx, -ly);
  g.addColorStop(0, shade(base, 0.3));
  g.addColorStop(0.5, base);
  g.addColorStop(1, shade(base, -0.45));
  return g;
}

function glassFill(ctx, angle, r, base) {
  const a = LIGHT - angle, lx = Math.cos(a) * r, ly = Math.sin(a) * r;
  const g = ctx.createLinearGradient(lx, ly, -lx, -ly);
  g.addColorStop(0, shade(base, 0.45));
  g.addColorStop(0.4, base);
  g.addColorStop(1, shade(base, -0.6));
  return g;
}

const OUTLINE = 'rgba(0,0,0,0.5)';

function outlinePath(ctx) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// Helicopter seen from above, nose pointing along +x.
// o: { body, dark, accent, glass, scale, shadow, flash, turbo }
function drawChopper(ctx, x, y, angle, rotor, o) {
  const s = o.scale || 1;
  const shadow = !!o.shadow, f = !!o.flash;
  const sil = 'rgba(0,0,0,0.22)';
  const lit = (r, c) => (shadow ? sil : litFill(ctx, angle, r, c, f));
  const solid = (c) => (shadow ? sil : f ? '#ffffff' : c);
  const outline = () => {
    if (!shadow) outlinePath(ctx);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);

  // Tail boom, tapering to the fin.
  ctx.fillStyle = lit(5, o.body);
  ctx.beginPath();
  ctx.moveTo(-6, -4.5); ctx.lineTo(-44, -1.8); ctx.lineTo(-44, 1.8); ctx.lineTo(-6, 4.5);
  ctx.closePath();
  ctx.fill();
  outline();
  // Horizontal stabiliser with end plates.
  ctx.fillStyle = lit(10, o.body);
  ctx.beginPath();
  ctx.roundRect(-37, -10, 6, 20, 1.5);
  ctx.fill();
  outline();
  ctx.fillStyle = solid(o.dark);
  ctx.fillRect(-38, -11, 8, 2.2);
  ctx.fillRect(-38, 8.8, 8, 2.2);
  // Fin.
  ctx.beginPath();
  ctx.moveTo(-41, -2); ctx.lineTo(-49, -3); ctx.lineTo(-50, 3); ctx.lineTo(-41, 2);
  ctx.closePath();
  ctx.fill();

  // Stub wings.
  ctx.fillStyle = lit(20, o.body);
  ctx.beginPath();
  ctx.moveTo(-4, -20); ctx.lineTo(4, -20); ctx.lineTo(7, -6); ctx.lineTo(7, 6);
  ctx.lineTo(4, 20); ctx.lineTo(-4, 20); ctx.lineTo(-6, 6); ctx.lineTo(-6, -6);
  ctx.closePath();
  ctx.fill();
  outline();
  // Gun pods on the wingtips.
  for (const side of [-1, 1]) {
    ctx.fillStyle = lit(4, o.dark);
    ctx.beginPath();
    ctx.roundRect(-9, side * 19.5 - 3.5, 22, 7, 3.5);
    ctx.fill();
    outline();
  }

  // Fuselage.
  ctx.fillStyle = lit(11, o.body);
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.quadraticCurveTo(24, -10, 8, -11);
  ctx.lineTo(-10, -9);
  ctx.quadraticCurveTo(-17, 0, -10, 9);
  ctx.lineTo(8, 11);
  ctx.quadraticCurveTo(24, 10, 28, 0);
  ctx.fill();
  outline();

  if (!shadow) {
    // Gun barrels.
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(13, -19.5); ctx.lineTo(24, -19.5);
    ctx.moveTo(13, 19.5); ctx.lineTo(24, 19.5);
    ctx.stroke();

    // Panel lines.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-2, -10); ctx.lineTo(-2, 10);
    ctx.moveTo(-26, -2.9); ctx.lineTo(-26, 2.9);
    ctx.stroke();

    // Livery: pale belly showing along the flanks.
    ctx.strokeStyle = f ? '#ffffff' : o.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, -4);
    ctx.quadraticCurveTo(15, -10.5, -9, -8.6);
    ctx.moveTo(25, 4);
    ctx.quadraticCurveTo(15, 10.5, -9, 8.6);
    ctx.stroke();

    // Engine nacelles with intakes and exhausts.
    for (const side of [-1, 1]) {
      ctx.fillStyle = litFill(ctx, angle, 3, o.dark, f);
      ctx.beginPath();
      ctx.roundRect(-13, side * 6 - 2.5, 15, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#0b0c0e';
      ctx.beginPath();
      ctx.ellipse(1.5, side * 6, 1.2, 2, 0, 0, TAU);
      ctx.ellipse(-13, side * 6, 1.6, 2.2, 0, 0, TAU);
      ctx.fill();
    }
    if (o.turbo) {
      const gr = ctx.createRadialGradient(-17, 0, 0, -17, 0, 24);
      gr.addColorStop(0, 'rgba(255,230,160,0.95)');
      gr.addColorStop(0.35, 'rgba(255,130,40,0.6)');
      gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(-20, 0, 24, 0, TAU);
      ctx.fill();
    }

    // Chin gun.
    ctx.fillStyle = '#2a2d31';
    ctx.beginPath();
    ctx.arc(24.5, 0, 2.6, 0, TAU);
    ctx.fill();
    ctx.fillRect(25, -0.7, 6, 1.4);

    // Tandem cockpit: gunner in front, pilot behind.
    ctx.fillStyle = f ? '#ffffff' : shade(o.dark, -0.3);
    ctx.beginPath();
    ctx.ellipse(15, 0, 10, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = glassFill(ctx, angle, 6, o.glass || '#22445c');
    ctx.beginPath();
    ctx.ellipse(19.5, 0, 4.6, 4.6, 0, 0, TAU);
    ctx.ellipse(10.5, 0, 4.4, 5.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(20.5, -2, 2.4, 1.1, -0.4, 0, TAU);
    ctx.ellipse(11.5, -2.6, 2.4, 1.1, -0.3, 0, TAU);
    ctx.fill();

    // Navigation lights: red to port, green to starboard, and a flashing tail beacon.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(2, -23.4, 1.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#34d36a';
    ctx.beginPath();
    ctx.arc(2, 23.4, 1.3, 0, TAU);
    ctx.fill();
    if (Math.sin(rotor * 0.3) > 0.6) {
      const gl = ctx.createRadialGradient(-45, 0, 0, -45, 0, 6);
      gl.addColorStop(0, 'rgba(255,90,70,0.9)');
      gl.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(-45, 0, 6, 0, TAU);
      ctx.fill();
    }

    // Tail rotor, seen edge-on.
    ctx.strokeStyle = `rgba(220,220,220,${0.25 + 0.3 * Math.abs(Math.sin(rotor * 2))})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-52, 4.5);
    ctx.lineTo(-38, 4.5);
    ctx.stroke();
  }

  ctx.translate(2, 0);
  drawRotor(ctx, 38, 4, rotor, shadow);
  ctx.restore();
}

// Main rotor around the current origin: a motion-blurred disc, trailing ghost blades,
// then the blades themselves with painted tips.
function drawRotor(ctx, R, blades, rotor, shadow) {
  ctx.save();
  if (!shadow) {
    const disc = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    disc.addColorStop(0, 'rgba(180,190,200,0.03)');
    disc.addColorStop(0.85, 'rgba(180,190,200,0.10)');
    disc.addColorStop(1, 'rgba(210,215,220,0.2)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = shadow ? 'rgba(0,0,0,0.16)' : 'rgba(25,27,30,0.6)';
  for (let k = 0; k < 3; k++) {
    const a0 = rotor - k * 0.13;
    ctx.globalAlpha = 1 - k * 0.32;
    ctx.beginPath();
    for (let b = 0; b < blades; b++) {
      const a = a0 + (b * TAU) / blades;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!shadow) {
    // Painted blade tips.
    ctx.strokeStyle = 'rgba(230,200,70,0.85)';
    ctx.beginPath();
    for (let b = 0; b < blades; b++) {
      const a = rotor + (b * TAU) / blades;
      ctx.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.stroke();
    ctx.fillStyle = '#3d4146';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8a9096';
    ctx.beginPath();
    ctx.arc(-0.8, -0.8, 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Light scout helicopter: slim body, bubble canopy, skids and a shrouded tail rotor.
function drawScout(ctx, x, y, angle, rotor, o) {
  const s = o.scale || 1;
  const shadow = !!o.shadow, f = !!o.flash;
  const sil = 'rgba(0,0,0,0.22)';
  const lit = (r, c) => (shadow ? sil : litFill(ctx, angle, r, c, f));
  const outline = () => {
    if (!shadow) outlinePath(ctx);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);

  // Skids and cross tubes.
  ctx.strokeStyle = shadow ? sil : f ? '#ffffff' : '#2a2d31';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -9.5); ctx.lineTo(17, -9.5);
  ctx.moveTo(-10, 9.5); ctx.lineTo(17, 9.5);
  ctx.moveTo(-4, -9.5); ctx.lineTo(-4, 9.5);
  ctx.moveTo(9, -9.5); ctx.lineTo(9, 9.5);
  ctx.stroke();

  // Tail boom with a small stabiliser.
  ctx.fillStyle = lit(4, o.body);
  ctx.beginPath();
  ctx.moveTo(-6, -2.8); ctx.lineTo(-37, -1.3); ctx.lineTo(-37, 1.3); ctx.lineTo(-6, 2.8);
  ctx.closePath();
  ctx.fill();
  outline();
  ctx.beginPath();
  ctx.roundRect(-30, -6.5, 4, 13, 1.5);
  ctx.fill();
  outline();
  // Shrouded tail rotor.
  ctx.fillStyle = lit(5, o.dark);
  ctx.beginPath();
  ctx.arc(-40, 0, 4.6, 0, TAU);
  ctx.fill();
  outline();

  // Gun pods slung on the skid mounts.
  for (const side of [-1, 1]) {
    ctx.fillStyle = lit(2, o.dark);
    ctx.beginPath();
    ctx.roundRect(3, side * 8 - 1.8, 14, 3.6, 1.8);
    ctx.fill();
    outline();
  }

  // Teardrop body.
  ctx.fillStyle = lit(9, o.body);
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.quadraticCurveTo(20, -9, 6, -9);
  ctx.lineTo(-6, -7);
  ctx.quadraticCurveTo(-11, 0, -6, 7);
  ctx.lineTo(6, 9);
  ctx.quadraticCurveTo(20, 9, 22, 0);
  ctx.fill();
  outline();

  if (!shadow) {
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(16, -8); ctx.lineTo(22, -8);
    ctx.moveTo(16, 8); ctx.lineTo(22, 8);
    ctx.stroke();

    // Livery band on the boom and the engine housing behind the cabin.
    ctx.fillStyle = f ? '#ffffff' : o.accent;
    ctx.fillRect(-25, -2.1, 4, 4.2);
    ctx.fillStyle = litFill(ctx, angle, 4, o.dark, f);
    ctx.beginPath();
    ctx.roundRect(-8, -3.5, 9, 7, 2.5);
    ctx.fill();
    ctx.fillStyle = '#0b0c0e';
    ctx.beginPath();
    ctx.ellipse(-8.5, 0, 1.5, 2.4, 0, 0, TAU);
    ctx.fill();
    if (o.turbo) {
      const gr = ctx.createRadialGradient(-11, 0, 0, -11, 0, 16);
      gr.addColorStop(0, 'rgba(255,230,160,0.95)');
      gr.addColorStop(0.35, 'rgba(255,130,40,0.6)');
      gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(-13, 0, 16, 0, TAU);
      ctx.fill();
    }

    // Big bubble canopy with a centre frame.
    ctx.fillStyle = glassFill(ctx, angle, 7, o.glass);
    ctx.beginPath();
    ctx.ellipse(11, 0, 9, 7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = f ? '#ffffff' : shade(o.dark, -0.2);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -6.6); ctx.lineTo(8, 6.6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(13.5, -3, 3.4, 1.4, -0.4, 0, TAU);
    ctx.fill();

    // Navigation lights and the tail rotor's spinning blades.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(17, -9.5, 1.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#34d36a';
    ctx.beginPath();
    ctx.arc(17, 9.5, 1.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,220,220,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const ta = rotor * 3;
    ctx.moveTo(-40 - Math.cos(ta) * 3.2, -Math.sin(ta) * 3.2);
    ctx.lineTo(-40 + Math.cos(ta) * 3.2, Math.sin(ta) * 3.2);
    ctx.stroke();
  }

  ctx.translate(3, 0);
  drawRotor(ctx, 32, 3, rotor, shadow);
  ctx.restore();
}

// Heavy tandem-rotor gunship: long armoured hull, stub wings with gun pods, two rotors.
function drawHeavy(ctx, x, y, angle, rotor, o) {
  const s = o.scale || 1;
  const shadow = !!o.shadow, f = !!o.flash;
  const sil = 'rgba(0,0,0,0.22)';
  const lit = (r, c) => (shadow ? sil : litFill(ctx, angle, r, c, f));
  const outline = () => {
    if (!shadow) outlinePath(ctx);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);

  // Stub wings with a gun pod and a missile rail on each side.
  ctx.fillStyle = lit(26, o.body);
  ctx.beginPath();
  ctx.moveTo(-6, -27); ctx.lineTo(6, -27); ctx.lineTo(9, -10); ctx.lineTo(9, 10);
  ctx.lineTo(6, 27); ctx.lineTo(-6, 27); ctx.lineTo(-8, 10); ctx.lineTo(-8, -10);
  ctx.closePath();
  ctx.fill();
  outline();
  for (const side of [-1, 1]) {
    ctx.fillStyle = lit(4, o.dark);
    ctx.beginPath();
    ctx.roundRect(-10, side * 24 - 3.8, 25, 7.6, 3.8);
    ctx.fill();
    outline();
    ctx.fillStyle = shadow ? sil : f ? '#ffffff' : '#d8d4c8';
    ctx.beginPath();
    ctx.roundRect(-6, side * 16 - 1.4, 16, 2.8, 1.4);
    ctx.fill();
  }

  // Engine nacelles on the rear flanks.
  for (const side of [-1, 1]) {
    ctx.fillStyle = lit(4, o.dark);
    ctx.beginPath();
    ctx.roundRect(-34, side * 13 - 3.5, 20, 7, 3.5);
    ctx.fill();
    outline();
  }

  // Hull.
  ctx.fillStyle = lit(12, o.body);
  ctx.beginPath();
  ctx.moveTo(38, -5); ctx.quadraticCurveTo(38, -10, 30, -10.5);
  ctx.lineTo(-34, -10); ctx.quadraticCurveTo(-40, -10, -40, -4);
  ctx.lineTo(-40, 4); ctx.quadraticCurveTo(-40, 10, -34, 10);
  ctx.lineTo(30, 10.5); ctx.quadraticCurveTo(38, 10, 38, 5);
  ctx.closePath();
  ctx.fill();
  outline();

  if (!shadow) {
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(15, -24); ctx.lineTo(30, -24);
    ctx.moveTo(15, 24); ctx.lineTo(30, 24);
    ctx.stroke();
    ctx.fillStyle = '#b8342a';
    ctx.fillRect(9.5, -17.4, 2, 2.8);
    ctx.fillRect(9.5, 14.6, 2, 2.8);

    // Rotor pylons, a spine stripe and armour panel lines.
    ctx.fillStyle = f ? '#ffffff' : o.accent;
    ctx.fillRect(-22, -1.2, 36, 2.4);
    for (const px of [24, -28]) {
      ctx.fillStyle = litFill(ctx, angle, 6, o.dark, f);
      ctx.beginPath();
      ctx.roundRect(px - 7, -6, 14, 12, 4);
      ctx.fill();
      outlinePath(ctx);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const lx of [-12, 2, 14]) {
      ctx.moveTo(lx, -10); ctx.lineTo(lx, 10);
    }
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#0b0c0e';
      ctx.beginPath();
      ctx.ellipse(-34, side * 13, 1.6, 2.6, 0, 0, TAU);
      ctx.fill();
    }
    if (o.turbo) {
      const gr = ctx.createRadialGradient(-38, 0, 0, -38, 0, 26);
      gr.addColorStop(0, 'rgba(255,230,160,0.95)');
      gr.addColorStop(0.35, 'rgba(255,130,40,0.6)');
      gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(-40, 0, 26, 0, TAU);
      ctx.fill();
    }

    // Wide cockpit glazing across the nose.
    ctx.fillStyle = glassFill(ctx, angle, 8, o.glass);
    ctx.beginPath();
    ctx.moveTo(36.5, -4.5); ctx.quadraticCurveTo(36, -8.5, 31, -8.5);
    ctx.lineTo(31, 8.5); ctx.quadraticCurveTo(36, 8.5, 36.5, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = f ? '#ffffff' : shade(o.dark, -0.3);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(31, -3); ctx.lineTo(37, -3);
    ctx.moveTo(31, 3); ctx.lineTo(37, 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(32.5, -7, 2.5, 3);

    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(0, -27.6, 1.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#34d36a';
    ctx.beginPath();
    ctx.arc(0, 27.6, 1.4, 0, TAU);
    ctx.fill();
  }

  // Counter-rotating rotors fore and aft.
  ctx.translate(24, 0);
  drawRotor(ctx, 30, 3, rotor, shadow);
  ctx.translate(-52, 0);
  drawRotor(ctx, 30, 3, -rotor + 0.5, shadow);
  ctx.restore();
}

function drawJetShape(ctx, x, y, angle, o) {
  const shadow = !!o.shadow, f = !!o.flash;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(o.scale || 1, o.scale || 1);
  if (!shadow) {
    const r = 15 + Math.random() * 4;
    const gr = ctx.createRadialGradient(-30, 0, 0, -30, 0, r);
    gr.addColorStop(0, 'rgba(255,240,200,0.95)');
    gr.addColorStop(0.4, 'rgba(255,150,50,0.7)');
    gr.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(-32, 0, r, 0, TAU);
    ctx.fill();
  }

  // Swept wings and tailplanes.
  ctx.fillStyle = shadow ? 'rgba(0,0,0,0.2)' : litFill(ctx, angle, 25, o.body, f);
  ctx.beginPath();
  const pts = [[34, 0], [6, -5], [-12, -25], [-17, -6], [-25, -12], [-28, -3], [-28, 3], [-25, 12], [-17, 6], [-12, 25], [6, 5]];
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
  if (!shadow) {
    outlinePath(ctx);

    // Fuselage spine.
    ctx.fillStyle = litFill(ctx, angle, 5, o.body, f);
    ctx.beginPath();
    ctx.ellipse(2, 0, 30, 4.6, 0, 0, TAU);
    ctx.fill();
    outlinePath(ctx);
    // Intakes and twin tail fins.
    ctx.fillStyle = '#1b1f22';
    ctx.fillRect(-2, -6.2, 9, 1.8);
    ctx.fillRect(-2, 4.4, 9, 1.8);
    ctx.strokeStyle = f ? '#ffffff' : shade(o.body, -0.5);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-17, -4); ctx.lineTo(-26, -7);
    ctx.moveTo(-17, 4); ctx.lineTo(-26, 7);
    ctx.stroke();

    // Canopy.
    ctx.fillStyle = glassFill(ctx, angle, 4, '#3d5566');
    ctx.beginPath();
    ctx.ellipse(15, 0, 7, 3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(16.5, -1.1, 3, 0.9, -0.2, 0, TAU);
    ctx.fill();

    // Wing roundels.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#e8e4d8';
      ctx.beginPath();
      ctx.arc(-11, side * 16, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b8342a';
      ctx.beginPath();
      ctx.arc(-11, side * 16, 1.9, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Ground vehicles cast a soft shadow down-right of their footprint.
function groundShadow(ctx, x, y, w, h, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 4, w, h, r);
  ctx.fill();
}

function drawWheel(ctx, x, y, w, h) {
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 1, y + 0.5, w - 2, 0.8);
}

// ---------------------------------------------------------------- projectiles

class Bullet {
  constructor(x, y, vx, vy, owner, dmg, life, kind = 'bullet') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.owner = owner; this.dmg = dmg; this.life = life; this.kind = kind;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.owner === 'p') {
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 0.022, this.y - this.vy * 0.022);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    } else if (this.kind === 'shell') {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff6a3a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, TAU);
      ctx.fill();
    }
  }
}

class Missile {
  constructor(x, y, angle, owner, target, o) {
    this.x = x; this.y = y; this.angle = angle;
    this.owner = owner; this.target = target;
    this.speed = o.speed; this.maxSpeed = o.maxSpeed; this.accel = o.accel;
    this.turn = o.turn; this.dmg = o.dmg; this.life = o.life;
    this.dead = false;
    this.trailT = 0;
    this.arm = 0.12; // brief unguided boost off the rail
  }
  update(dt, g) {
    this.arm -= dt;
    const t = this.target;
    if (t && !t.dead && this.arm <= 0) {
      this.angle = turnToward(this.angle, Math.atan2(t.y - this.y, t.x - this.x), this.turn * dt);
    } else if (this.owner === 'p' && (!t || t.dead)) {
      this.target = g.findTarget(this.x, this.y, this.angle, 650);
    }
    this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.018;
      g.particles.push(new Particle(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8,
        rand(-10, 10), rand(-10, 10), rand(0.5, 0.9), 3, 9, 'trail'));
    }
    if (this.life <= 0) {
      this.dead = true;
      g.explode(this.x, this.y, 10);
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.owner === 'p' ? '#e8e8e8' : '#d9d2c0';
    ctx.fillRect(-7, -1.8, 13, 3.6);
    ctx.fillStyle = this.owner === 'p' ? '#2a2a2a' : '#b83020';
    ctx.fillRect(4, -1.8, 3, 3.6);
    ctx.fillRect(-7, -3.5, 3, 7);
    ctx.fillStyle = 'rgba(255,200,90,0.9)';
    ctx.beginPath();
    ctx.arc(-9, 0, 3 + Math.random() * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

class Flare {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = 2.6;
    this.dead = false;
  }
  update(dt, g) {
    const k = Math.exp(-1.6 * dt);
    this.vx *= k;
    this.vy *= k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (Math.random() < 0.6) g.particles.push(new Particle(this.x, this.y, rand(-15, 15), rand(-15, 15), 0.5, 3, 6, 'trail'));
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const r = 6 + Math.random() * 4;
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,0.35)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- effects

class Particle {
  constructor(x, y, vx, vy, life, size, grow, type, rot = 0) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.size = size; this.grow = grow; this.type = type;
    this.rot = rot;
    this.dead = false;
  }
  update(dt) {
    const drag = this.type === 'spark' || this.type === 'debris' ? 2 : 3;
    const k = Math.exp(-drag * dt);
    this.vx *= k;
    this.vy *= k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.size += this.grow * dt;
    this.rot += dt * 8;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  get additive() {
    return this.type === 'fire' || this.type === 'spark' || this.type === 'flash' || this.type === 'muzzle';
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    switch (this.type) {
      case 'smoke':
        ctx.fillStyle = `rgba(48,46,44,${0.4 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'trail':
        ctx.fillStyle = `rgba(215,215,210,${0.35 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'debris':
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = `rgba(30,28,26,${Math.min(1, t * 2)})`;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
        ctx.restore();
        break;
      case 'fire': {
        const r = 255, gg = (90 + 160 * t) | 0, b = (30 + 120 * t * t) | 0;
        ctx.fillStyle = `rgba(${r},${gg},${b},${0.75 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      }
      case 'spark':
        ctx.strokeStyle = `rgba(255,214,130,${t})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
        ctx.stroke();
        break;
      case 'muzzle':
        ctx.fillStyle = `rgba(255,230,140,${t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'flash': {
        const gr = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gr.addColorStop(0, `rgba(255,250,230,${t})`);
        gr.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      }
    }
  }
}

class Pickup {
  constructor(x, y, kind) {
    this.x = x; this.y = y; this.kind = kind;
    this.life = 20;
    this.t = Math.random() * 10;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.life < 4 && Math.floor(this.t * 8) % 2) return;
    const s = 1 + Math.sin(this.t * 4) * 0.08;
    const col = { repair: '#4cd47a', missiles: '#ffb02e', flares: '#5ec8ff' }[this.kind];
    const label = { repair: '+', missiles: 'M', flares: 'F' }[this.kind];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(3, 4, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10161c';
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- player

// Player airframes, chosen in the hangar: how each one looks and handles.
// gun: muzzle position (x forward, y to each side), seconds between rounds, damage, heat per round.
// missileMount: launch position (x forward, y to each side). turn: nose turn rate in rad/s.
const VEHICLES = {
  stormwolf: {
    name: 'STORMWOLF',
    role: 'ATTACK HELICOPTER',
    blurb: 'The all-rounder. Solid armour, a good missile load and twin wing guns.',
    draw: drawChopper,
    colors: { body: '#1b1f24', dark: '#2c3238', accent: '#e9ecef', glass: '#294d66' },
    r: 20,
    hp: 100,
    missiles: 8,
    flares: 4,
    speed: 270,
    turboSpeed: 580,
    turn: 7,
    gun: { x: 24, y: 19.5, cd: 0.06, dmg: 7, heat: 2.8 },
    missileMount: { x: 4, y: 20 },
  },
  kestrel: {
    name: 'KESTREL',
    role: 'SCOUT HELICOPTER',
    blurb: 'Fast and nimble with a fast-firing gun and extra flares, but light armour.',
    draw: drawScout,
    colors: { body: '#c4c9ce', dark: '#6f7880', accent: '#ff8a1f', glass: '#2b5a78' },
    r: 16,
    hp: 65,
    missiles: 4,
    flares: 7,
    speed: 335,
    turboSpeed: 690,
    turn: 10,
    gun: { x: 22, y: 8, cd: 0.045, dmg: 5, heat: 2.2 },
    missileMount: { x: 8, y: 8 },
  },
  titan: {
    name: 'TITAN',
    role: 'HEAVY GUNSHIP',
    blurb: 'A flying tank. Huge armour and missile load, heavy guns, slow to turn.',
    draw: drawHeavy,
    colors: { body: '#2b3a52', dark: '#1a2433', accent: '#e0b84a', glass: '#3a5a6e' },
    r: 26,
    hp: 170,
    missiles: 14,
    flares: 4,
    speed: 205,
    turboSpeed: 440,
    turn: 4.5,
    gun: { x: 30, y: 24, cd: 0.075, dmg: 10, heat: 3 },
    missileMount: { x: 10, y: 16 },
  },
};

class Player {
  constructor(x, y, vehicle = VEHICLES.stormwolf) {
    this.vehicle = vehicle;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2;
    this.aimAngle = this.angle;
    this.r = vehicle.r;
    this.hp = this.maxHp = vehicle.hp;
    this.missiles = this.maxMissiles = vehicle.missiles;
    this.flares = this.maxFlares = vehicle.flares;
    this.turbo = 100;
    this.heat = 0;
    this.overheat = false;
    this.gunCd = 0; this.misCd = 0; this.flareCd = 0;
    this.rotor = 0;
    this.gunSide = 1; this.misSide = 1;
    this.turboOn = false;
    this.hitFlash = 0;
    this.rearmT = 0;
    this.onPad = false;
    this.dead = false;
  }

  update(dt, g, c) {
    let mx = c.mx, my = c.my;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }

    this.turboOn = c.turbo && this.turbo > 1 && ml > 0.1;
    if (this.turboOn) this.turbo = Math.max(0, this.turbo - 30 * dt);
    else this.turbo = Math.min(100, this.turbo + 9 * dt);

    const maxSpd = this.turboOn ? this.vehicle.turboSpeed : this.vehicle.speed;
    const k = 1 - Math.exp(-(this.turboOn ? 2.4 : 3.2) * dt);
    this.vx += (mx * maxSpd - this.vx) * k;
    this.vy += (my * maxSpd - this.vy) * k;
    this.x = clamp(this.x + this.vx * dt, 40, WORLD_W - 40);
    this.y = clamp(this.y + this.vy * dt, 40, WORLD_H - 40);

    this.angle = turnToward(this.angle, Math.atan2(c.aimY - this.y, c.aimX - this.x), this.vehicle.turn * dt);
    this.rotor += dt * (this.turboOn ? 52 : 40);

    this.gunCd -= dt; this.misCd -= dt; this.flareCd -= dt; this.hitFlash -= dt;
    this.heat = Math.max(0, this.heat - 26 * dt);
    if (this.overheat && this.heat < 35) this.overheat = false;

    const ca = Math.cos(this.angle), sa = Math.sin(this.angle);

    const gun = this.vehicle.gun, mm = this.vehicle.missileMount;
    if (c.fire && !this.overheat && this.gunCd <= 0) {
      this.gunCd = gun.cd;
      this.heat += gun.heat;
      if (this.heat >= 100) {
        this.heat = 100;
        this.overheat = true;
        Sfx.overheat();
      }
      this.gunSide *= -1;
      const ox = this.x + ca * gun.x - sa * gun.y * this.gunSide;
      const oy = this.y + sa * gun.x + ca * gun.y * this.gunSide;
      let a = this.angle;
      // Keyboard players get a little help: rounds bend onto a target that is nearly dead ahead.
      const t = g.lockTarget;
      if (c.assist && t) {
        const ta = Math.atan2(t.y - oy, t.x - ox);
        if (Math.abs(angDiff(this.angle, ta)) < 0.22) a = ta;
      }
      a += rand(-0.035, 0.035);
      g.bullets.push(new Bullet(ox, oy, Math.cos(a) * 980 + this.vx * 0.5, Math.sin(a) * 980 + this.vy * 0.5, 'p', gun.dmg, 0.7));
      g.particles.push(new Particle(ox, oy, this.vx, this.vy, 0.05, 5, 0, 'muzzle'));
      Sfx.gun();
    }

    if (c.missile && this.misCd <= 0 && this.missiles > 0) {
      this.misCd = 0.4;
      this.missiles--;
      this.misSide *= -1;
      const ox = this.x + ca * mm.x - sa * mm.y * this.misSide;
      const oy = this.y + sa * mm.x + ca * mm.y * this.misSide;
      const spd = Math.hypot(this.vx, this.vy);
      g.missiles.push(new Missile(ox, oy, this.angle, 'p', g.lockTarget,
        { speed: 260 + spd * 0.5, maxSpeed: 840, accel: 950, turn: 4.8, dmg: 55, life: 2.8 }));
      Sfx.missile();
    }

    if (c.flare && this.flareCd <= 0 && this.flares > 0) {
      this.flareCd = 1.0;
      this.flares--;
      const fl = [];
      for (let i = 0; i < 6; i++) {
        const a = this.angle + Math.PI + rand(-1.3, 1.3);
        const f = new Flare(this.x, this.y, Math.cos(a) * rand(150, 300) + this.vx * 0.3, Math.sin(a) * rand(150, 300) + this.vy * 0.3);
        fl.push(f);
        g.flares.push(f);
      }
      // Missiles already tracking us have a good chance of chasing the decoys instead.
      for (const m of g.missiles) {
        if (m.owner === 'e' && m.target === this && Math.random() < 0.85 && dist2(m.x, m.y, this.x, this.y) < 900 * 900) {
          m.target = pick(fl);
        }
      }
      Sfx.flare();
    }

    const dB = dist(this.x, this.y, g.base.x, g.base.y);
    this.onPad = dB < 110 && Math.hypot(this.vx, this.vy) < 90;
    if (this.onPad) {
      this.hp = Math.min(this.maxHp, this.hp + 18 * dt);
      this.turbo = Math.min(100, this.turbo + 30 * dt);
      this.rearmT += dt;
      if (this.rearmT > 0.35) {
        this.rearmT = 0;
        if (this.missiles < this.maxMissiles) this.missiles++;
        else if (this.flares < this.maxFlares) this.flares++;
      }
    }

    if (this.hp < 35 && Math.random() < dt * (40 - this.hp) * 0.4) {
      g.particles.push(new Particle(this.x - ca * 14, this.y - sa * 14, rand(-20, 20), rand(-20, 20), 1.2, 4, 14, 'smoke'));
    }
  }

  damage(n, g) {
    if (this.dead || g.state !== 'play') return;
    this.hp -= n;
    this.hitFlash = 0.12;
    g.shake(5);
    Sfx.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      g.playerDied();
    }
  }

  drawShadow(ctx) {
    this.vehicle.draw(ctx, this.x + 26, this.y + 34, this.angle, this.rotor, { shadow: true, scale: 0.92 });
  }

  draw(ctx) {
    this.vehicle.draw(ctx, this.x, this.y, this.angle, this.rotor, {
      ...this.vehicle.colors, turbo: this.turboOn, flash: this.hitFlash > 0,
    });
  }
}

// ---------------------------------------------------------------- enemies

class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.angle = rand(0, TAU);
    this.dead = false;
    this.gone = false; // left the map without being destroyed
    this.hitFlash = 0;
    this.objective = false;
    this.air = false;
    this.cd = rand(0.8, 2.5);
    this.burst = 0;
    this.burstT = 0;
    this.aware = false;
  }
  hurt(n, g) {
    if (this.dead) return;
    this.hp -= n;
    this.hitFlash = 0.07;
    this.aware = true;
    if (this.hp <= 0) {
      this.dead = true;
      this.die(g);
    }
  }
  die(g) {
    g.explode(this.x, this.y, this.boom, { ground: !this.air });
    if (!this.air) {
      g.terrain.addDecal({ type: 'wreck', x: this.x, y: this.y, angle: this.angle, w: this.r * 1.6, h: this.r });
      g.emitters.push({ x: this.x, y: this.y, life: 7 });
    }
    g.addScore(this.score, this.x, this.y);
    g.kills++;
    g.maybeDrop(this.x, this.y);
  }
  toPlayer(g) {
    const p = g.player;
    return { dx: p.x - this.x, dy: p.y - this.y, d: dist(p.x, p.y, this.x, this.y), a: Math.atan2(p.y - this.y, p.x - this.x) };
  }
  // Ground units stay on land: blocked moves turn them away from the water.
  groundMove(step) {
    const nx = this.x + Math.cos(this.angle) * step, ny = this.y + Math.sin(this.angle) * step;
    if (isLand(nx, ny)) {
      this.x = nx;
      this.y = ny;
      return true;
    }
    this.angle += Math.PI * 0.6 * (Math.random() < 0.5 ? 1 : -1);
    this.wander = this.angle;
    this.wanderT = rand(1.5, 3);
    return false;
  }
  drawHealth(ctx) {
    if (this.hp >= this.maxHp || this.isBoss) return;
    const w = this.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 12, w, 4);
    ctx.fillStyle = '#ff5a3c';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 12, (w * Math.max(0, this.hp)) / this.maxHp, 4);
  }
  drawShadow() {}
}

class Jeep extends Enemy {
  constructor(x, y, diff, leader = null) {
    super(x, y);
    this.r = 14;
    this.hp = this.maxHp = 22 * diff;
    this.score = 100;
    this.boom = 24;
    this.speed = 120;
    this.turret = this.angle;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.wander = this.angle;
    this.wanderT = 0;
    this.leader = leader;
    this.offset = { x: rand(-70, 70), y: rand(-70, 70) };
    this.rate = diff;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    let ta, speed = this.speed, free = false;
    if (this.leader && !this.leader.dead && (t.d > 650 || p.dead)) {
      const tx = this.leader.x + this.offset.x, ty = this.leader.y + this.offset.y;
      ta = Math.atan2(ty - this.y, tx - this.x);
      const d = dist(tx, ty, this.x, this.y);
      speed = d < 30 ? this.leader.speed : this.speed * 1.2;
      free = true; // escorts follow the road, bridges included
    } else if (t.d < 750 && !p.dead) {
      ta = t.d > 320 ? t.a : t.a + (Math.PI / 2) * this.dir;
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(2, 5);
        this.wander = rand(0, TAU);
      }
      ta = this.wander;
      speed *= 0.6;
    }
    this.angle = turnToward(this.angle, ta, 2.4 * dt);
    if (free) {
      this.x += Math.cos(this.angle) * speed * dt;
      this.y += Math.sin(this.angle) * speed * dt;
    } else this.groundMove(speed * dt);

    this.turret = turnToward(this.turret, t.a, 4 * dt);
    this.cd -= dt;
    this.burstT -= dt;
    if (t.d < 480 && !p.dead && this.cd <= 0 && Math.abs(angDiff(this.turret, t.a)) < 0.2) {
      this.burst = 3;
      this.cd = rand(1.6, 2.6) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.12;
      g.enemyShoot(this.x, this.y, this.turret, 430, 4, 'bullet', 0.08, 10);
    }
    this.hitFlash -= dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    groundShadow(ctx, -14, -8, 29, 16, 3);
    for (const wx of [-11, 5]) {
      drawWheel(ctx, wx, -9.5, 7, 3);
      drawWheel(ctx, wx, 6.5, 7, 3);
    }
    // Spare wheel on the tailgate.
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-14, 0, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = litFill(ctx, this.angle, 8, '#8f8455', f);
    ctx.beginPath();
    ctx.roundRect(-13, -7, 27, 14, 3);
    ctx.fill();
    outlinePath(ctx);
    // Bonnet, grille and windscreen.
    ctx.fillStyle = litFill(ctx, this.angle, 6, '#a3976a', f);
    ctx.beginPath();
    ctx.roundRect(5, -6, 8.5, 12, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(9, -5); ctx.lineTo(9, 5);
    ctx.moveTo(13.4, -4); ctx.lineTo(13.4, 4);
    ctx.stroke();
    ctx.fillStyle = glassFill(ctx, this.angle, 6, '#2e3a40');
    ctx.fillRect(2, -6, 2.5, 12);
    // Open rear bed with a roll bar.
    ctx.fillStyle = f ? '#fff' : '#5f5838';
    ctx.beginPath();
    ctx.roundRect(-12, -5.5, 11, 11, 1.5);
    ctx.fill();
    ctx.fillStyle = '#2b2b26';
    ctx.fillRect(-1.5, -6.5, 1.5, 13);
    // Gunner and pintle machine gun, which turns independently.
    ctx.translate(-6, 0);
    ctx.rotate(this.turret - this.angle);
    ctx.fillStyle = '#222';
    ctx.fillRect(1, -0.8, 13, 1.6);
    ctx.fillRect(2, -1.8, 4, 3.6);
    ctx.fillStyle = f ? '#fff' : '#3d4a2c';
    ctx.beginPath();
    ctx.arc(-1, 0, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(-1.8, -0.9, 1.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Truck extends Enemy {
  constructor(path, startDist, diff) {
    super(path[0].x, path[0].y);
    this.path = path;
    this.r = 16;
    this.hp = this.maxHp = 40 * diff;
    this.score = 300;
    this.boom = 30;
    this.speed = 50;
    this.objective = true;
    // Place the truck startDist along the route.
    let s = startDist;
    this.seg = 1;
    while (this.seg < path.length) {
      const a = path[this.seg - 1], b = path[this.seg];
      const l = dist(a.x, a.y, b.x, b.y);
      if (s <= l) {
        this.x = a.x + ((b.x - a.x) * s) / l;
        this.y = a.y + ((b.y - a.y) * s) / l;
        this.angle = Math.atan2(b.y - a.y, b.x - a.x);
        break;
      }
      s -= l;
      this.seg++;
    }
  }
  update(dt, g) {
    this.hitFlash -= dt;
    const t = this.path[this.seg];
    if (!t) return;
    const dx = t.x - this.x, dy = t.y - this.y;
    if (Math.hypot(dx, dy) < 20) {
      this.seg++;
      if (this.seg >= this.path.length) {
        this.dead = true;
        this.gone = true;
        g.escaped++;
        g.banner('TRUCK ESCAPED', '#ff6a4a');
      }
      return;
    }
    this.angle = turnToward(this.angle, Math.atan2(dy, dx), 3 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    groundShadow(ctx, -22, -9, 47, 18, 3);
    for (const wx of [-19, -10, 15]) {
      drawWheel(ctx, wx, -10.5, 7, 3);
      drawWheel(ctx, wx, 7.5, 7, 3);
    }
    // Cab with windscreen and roof hatch.
    ctx.fillStyle = litFill(ctx, this.angle, 9, '#4d5634', f);
    ctx.beginPath();
    ctx.roundRect(11, -8, 13, 16, 2.5);
    ctx.fill();
    outlinePath(ctx);
    ctx.fillStyle = glassFill(ctx, this.angle, 7, '#26323a');
    ctx.beginPath();
    ctx.roundRect(19.5, -6.5, 3, 13, 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(13.5, -2.5, 4, 5);
    // Canvas-covered cargo bed, sagging between its hoops.
    ctx.fillStyle = litFill(ctx, this.angle, 10, '#6b6a45', f);
    ctx.beginPath();
    ctx.roundRect(-22, -9, 32, 18, 2.5);
    ctx.fill();
    outlinePath(ctx);
    ctx.lineWidth = 1.2;
    for (let i = -16; i < 10; i += 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.moveTo(i, -9); ctx.lineTo(i, 9);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(i + 1.2, -9); ctx.lineTo(i + 1.2, 9);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-21, 0); ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Tank extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.r = 20;
    this.hp = this.maxHp = 75 * diff;
    this.score = 250;
    this.boom = 34;
    this.speed = 45;
    this.turret = this.angle;
    this.wander = this.angle;
    this.wanderT = 0;
    this.tread = 0;
    this.rate = diff;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    this.wanderT -= dt;
    if (t.d < 900 && !p.dead) {
      if (t.d > 380) this.wander = t.a;
      else if (this.wanderT <= 0) {
        this.wander = t.a + rand(-1.5, 1.5);
        this.wanderT = rand(2, 4);
      }
    } else if (this.wanderT <= 0) {
      this.wanderT = rand(3, 6);
      this.wander = rand(0, TAU);
    }
    this.angle = turnToward(this.angle, this.wander, 0.9 * dt);
    if (this.groundMove(this.speed * dt)) this.tread += dt * 30;
    this.turret = turnToward(this.turret, t.a, 1.6 * dt);
    this.cd -= dt;
    if (t.d < 560 && !p.dead && this.cd <= 0 && Math.abs(angDiff(this.turret, t.a)) < 0.12) {
      this.cd = rand(2.2, 3.2) / Math.sqrt(this.rate);
      g.enemyShoot(this.x, this.y, this.turret, 330, 13, 'shell', 0.02, 30);
      g.particles.push(new Particle(this.x + Math.cos(this.turret) * 30, this.y + Math.sin(this.turret) * 30, 0, 0, 0.1, 10, 0, 'muzzle'));
    }
    this.hitFlash -= dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    groundShadow(ctx, -22, -16, 44, 32, 4);
    // Tracks, with links that roll as the tank moves.
    for (const ty of [-15.5, 8.5]) {
      ctx.fillStyle = '#23241e';
      ctx.beginPath();
      ctx.roundRect(-22, ty, 44, 7, 2.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      for (let i = 0; i < 11; i++) {
        const xx = -21 + (((i * 4 + this.tread) % 42) + 42) % 42;
        ctx.fillRect(xx, ty + 0.5, 1.4, 6);
      }
    }
    // Hull with a sloped glacis and engine deck grilles.
    ctx.fillStyle = litFill(ctx, this.angle, 12, '#5b6340', f);
    ctx.beginPath();
    ctx.moveTo(-19, -10); ctx.lineTo(16, -10); ctx.lineTo(21, -6);
    ctx.lineTo(21, 6); ctx.lineTo(16, 10); ctx.lineTo(-19, 10);
    ctx.closePath();
    ctx.fill();
    outlinePath(ctx);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -17; i <= -11; i += 2) {
      ctx.moveTo(i, -6); ctx.lineTo(i, 6);
    }
    ctx.moveTo(16, -10); ctx.lineTo(16, 10);
    ctx.stroke();
    // Turret, barrel with muzzle brake, and the commander's hatch.
    ctx.rotate(this.turret - this.angle);
    ctx.fillStyle = litFill(ctx, this.turret, 3, '#4a5233', f);
    ctx.fillRect(6, -2, 23, 4);
    ctx.fillRect(28, -3, 4, 6);
    ctx.fillStyle = litFill(ctx, this.turret, 10, '#4f5737', f);
    ctx.beginPath();
    ctx.moveTo(-12, -7); ctx.lineTo(-6, -10); ctx.lineTo(5, -9); ctx.lineTo(10, -4);
    ctx.lineTo(10, 4); ctx.lineTo(5, 9); ctx.lineTo(-6, 10); ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    outlinePath(ctx);
    ctx.fillStyle = f ? '#fff' : '#3c4329';
    ctx.beginPath();
    ctx.arc(-4, -3.5, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.fillRect(-1, 3, 7, 1.2);
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class SamSite extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.r = 24;
    this.hp = this.maxHp = 90 * diff;
    this.score = 500;
    this.boom = 44;
    this.turret = rand(0, TAU);
    this.dish = 0;
    this.cd = rand(1, 3);
    this.rate = diff;
    this.loaded = 2;
    this.reload = 0;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    this.dish += dt * 2.5;
    this.hitFlash -= dt;
    const inRange = t.d < 820 && !p.dead;
    if (inRange) this.turret = turnToward(this.turret, t.a, 1.5 * dt);
    if (this.loaded < 2) {
      this.reload -= dt;
      if (this.reload <= 0) {
        this.loaded++;
        this.reload = 4;
      }
    }
    this.cd -= dt;
    if (inRange && this.cd <= 0 && this.loaded > 0 && Math.abs(angDiff(this.turret, t.a)) < 0.3) {
      this.loaded--;
      this.reload = 4;
      this.cd = rand(2.6, 3.6) / Math.sqrt(this.rate);
      g.launchEnemyMissile(this.x, this.y, this.turret, p);
    }
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(4, 5, 28, 0, TAU);
    ctx.fill();
    // Gravel pad inside a ring of sandbags.
    ctx.fillStyle = litFill(ctx, 0, 26, '#8b7b57', f);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      ctx.save();
      ctx.translate(Math.cos(a) * 22.5, Math.sin(a) * 22.5);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = litFill(ctx, a + Math.PI / 2, 4, i % 2 ? '#7a6c4b' : '#857552', f);
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.4, 3.4, 0, 0, TAU);
      ctx.fill();
      outlinePath(ctx);
      ctx.restore();
    }
    // Ammo crates.
    for (const [cx, cy] of [[11, 9], [6, 13]]) {
      ctx.fillStyle = litFill(ctx, 0, 3, '#4d5634', f);
      ctx.fillRect(cx - 2.5, cy - 2, 5, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(cx - 2.5, cy - 2, 5, 4);
    }
    ctx.fillStyle = litFill(ctx, 0, 12, '#5a5b4c', f);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.fill();
    outlinePath(ctx);
    // Rotating radar dish on its mast.
    ctx.save();
    ctx.translate(-13, -13);
    ctx.fillStyle = '#3a3b33';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, TAU);
    ctx.fill();
    ctx.rotate(this.dish);
    ctx.strokeStyle = f ? '#fff' : '#d4d4ca';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-4, 0, 8, -0.75, 0.75);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(5, 0);
    ctx.stroke();
    ctx.restore();
    // Twin-rail launcher that tracks the player.
    ctx.rotate(this.turret);
    ctx.fillStyle = litFill(ctx, this.turret, 9, '#3f4535', f);
    ctx.beginPath();
    ctx.roundRect(-8, -9, 16, 18, 2);
    ctx.fill();
    outlinePath(ctx);
    for (let i = 0; i < 2; i++) {
      const yy = i ? 4.5 : -4.5;
      ctx.fillStyle = '#2a2e24';
      ctx.fillRect(-7, yy - 2.2, 22, 4.4);
      if (i >= this.loaded) continue;
      ctx.fillStyle = litFill(ctx, this.turret, 2, '#e8e2d0', f);
      ctx.beginPath();
      ctx.roundRect(-6, yy - 1.6, 21, 3.2, 1.6);
      ctx.fill();
      ctx.fillStyle = '#b83020';
      ctx.beginPath();
      ctx.moveTo(15, yy - 1.6); ctx.lineTo(18, yy); ctx.lineTo(15, yy + 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9a958a';
      ctx.fillRect(-6, yy - 2.6, 3, 5.2);
    }
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Gunship extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.air = true;
    this.r = 20;
    this.hp = this.maxHp = 45 * diff;
    this.score = 300;
    this.boom = 34;
    this.speed = 210;
    this.range = rand(260, 360);
    this.orbit = rand(0, TAU);
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.rotor = rand(0, TAU);
    this.hx = x; this.hy = y;
    this.rate = diff;
    this.colors = { body: '#4a5638', dark: '#363f29', accent: '#9aa67a', glass: '#2a3b3a' };
    this.scale = 0.9;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    if (!this.aware && t.d < 950) this.aware = true;
    const engaged = this.aware && !p.dead;
    this.orbit += dt * 0.45 * this.dir;
    let tx, ty;
    if (engaged) {
      tx = p.x + Math.cos(this.orbit) * this.range;
      ty = p.y + Math.sin(this.orbit) * this.range;
    } else {
      tx = this.hx + Math.cos(this.orbit) * 250;
      ty = this.hy + Math.sin(this.orbit) * 250;
    }
    const ddx = tx - this.x, ddy = ty - this.y, dd = Math.hypot(ddx, ddy) || 1;
    const sp = Math.min(this.speed, dd * 1.5);
    const k = 1 - Math.exp(-2 * dt);
    this.vx += ((ddx / dd) * sp - this.vx) * k;
    this.vy += ((ddy / dd) * sp - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const face = engaged ? t.a : Math.atan2(this.vy, this.vx);
    this.angle = turnToward(this.angle, face, 3 * dt);
    this.rotor += dt * 40;
    this.hitFlash -= dt;
    this.attack(dt, g, t, engaged);
  }
  attack(dt, g, t, engaged) {
    this.cd -= dt;
    this.burstT -= dt;
    if (engaged && t.d < 540 && this.cd <= 0 && Math.abs(angDiff(this.angle, t.a)) < 0.25) {
      this.burst = 4;
      this.cd = rand(1.8, 3) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.11;
      g.enemyShoot(this.x, this.y, this.angle, 480, 5, 'bullet', 0.06, 24 * this.scale);
    }
  }
  drawShadow(ctx) {
    drawChopper(ctx, this.x + 26, this.y + 34, this.angle, this.rotor, { shadow: true, scale: this.scale * 0.92 });
  }
  draw(ctx) {
    drawChopper(ctx, this.x, this.y, this.angle, this.rotor, { ...this.colors, scale: this.scale, flash: this.hitFlash > 0 });
    this.drawHealth(ctx);
  }
}

class Boss extends Gunship {
  constructor(x, y, diff) {
    super(x, y, diff);
    this.isBoss = true;
    this.objective = true;
    this.name = 'RED TALON';
    this.r = 32;
    this.hp = this.maxHp = 900 * diff;
    this.score = 5000;
    this.boom = 70;
    this.speed = 250;
    this.range = 380;
    this.scale = 1.55;
    this.colors = { body: '#5c1714', dark: '#2b0c0a', accent: '#d9a441', glass: '#3a2020' };
    this.salvoCd = 5;
    this.dashT = 0;
    this.dashCd = 8;
  }
  update(dt, g) {
    if (this.aware) {
      this.dashCd -= dt;
      if (this.dashCd <= 0) {
        this.dashCd = rand(7, 11);
        this.dashT = 1.2;
        this.dir *= -1;
      }
    }
    this.dashT -= dt;
    this.speed = this.dashT > 0 ? 560 : 250;
    this.orbit += this.dashT > 0 ? dt * 1.2 * this.dir : 0;
    super.update(dt, g);
    if (this.dashT > 0 && Math.random() < 0.6) {
      g.particles.push(new Particle(this.x - Math.cos(this.angle) * 30, this.y - Math.sin(this.angle) * 30, 0, 0, 0.4, 8, 20, 'fire'));
    }
  }
  attack(dt, g, t, engaged) {
    this.cd -= dt;
    this.burstT -= dt;
    this.salvoCd -= dt;
    if (engaged && t.d < 620 && this.cd <= 0 && Math.abs(angDiff(this.angle, t.a)) < 0.3) {
      this.burst = 8;
      this.cd = rand(1.2, 2) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.08;
      for (const s of [-1, 1]) {
        const ox = this.x - Math.sin(this.angle) * 30 * s, oy = this.y + Math.cos(this.angle) * 30 * s;
        g.enemyShoot(ox, oy, this.angle, 520, 5, 'bullet', 0.05, 34);
      }
    }
    if (engaged && t.d < 900 && this.salvoCd <= 0) {
      this.salvoCd = rand(5, 7);
      g.launchEnemyMissile(this.x, this.y, this.angle + 0.5, g.player);
      g.launchEnemyMissile(this.x, this.y, this.angle - 0.5, g.player);
    }
  }
}

class Jet extends Enemy {
  constructor(x, y, tx, ty, diff) {
    super(x, y);
    this.air = true;
    this.r = 22;
    this.hp = this.maxHp = 35 * diff;
    this.score = 400;
    this.boom = 36;
    this.speed = 640;
    this.angle = Math.atan2(ty - y, tx - x);
    this.life = 10;
    this.fired = false;
  }
  update(dt, g) {
    const t = this.toPlayer(g);
    // Lazily track the player until committed to the pass.
    if (!this.fired && t.d > 500) this.angle = turnToward(this.angle, t.a, 0.5 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.hitFlash -= dt;
    if (!this.fired && !g.player.dead && t.d < 800 && Math.abs(angDiff(this.angle, t.a)) < 0.35) {
      this.fired = true;
      g.launchEnemyMissile(this.x, this.y, this.angle, g.player);
    }
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      this.gone = true;
    }
  }
  drawShadow(ctx) {
    drawJetShape(ctx, this.x + 40, this.y + 52, this.angle, { shadow: true, scale: 0.9 });
  }
  draw(ctx) {
    drawJetShape(ctx, this.x, this.y, this.angle, { body: '#7d8a93', flash: this.hitFlash > 0 });
  }
}
