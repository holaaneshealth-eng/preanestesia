/**
 * Renderizado de las instrucciones del paciente en castellano o catalán a partir
 * de datos estructurados y de las plantillas de textosPaciente. Sin texto redactado
 * fijo: todo se compone aquí, de modo que la vista en catalán no muestre castellano.
 */
import type { InstruccionPacienteEstructurada } from '../../dominio/salidas/qr/hojaPaciente.ts';
import type { AyunoQr } from '../../dominio/salidas/qr/hojaPaciente.ts';
import type { TextosPaciente } from './textosPaciente.ts';

function rellenar(plantilla: string, vars: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function fechaLarga(epoch: number, t: TextosPaciente): string {
  const d = new Date(epoch);
  return `${t.dias_semana[d.getDay()]} ${d.getDate()} de ${t.meses[d.getMonth()]}`;
}
export function horaReloj(epoch: number): string {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function capitalizar(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Fecha/hora concreta de una toma de insulina según el momento y la hora habitual. */
function epochToma(fecha: number, hora: string, momento: 'noche_previa' | 'manana_intervencion'): number {
  const [h, mm] = hora.split(':').map((x) => parseInt(x, 10));
  const d = new Date(fecha);
  if (momento === 'noche_previa') d.setDate(d.getDate() - 1);
  d.setHours(h ?? 0, mm ?? 0, 0, 0);
  return d.getTime();
}

/** Frase «cuándo» de una toma de insulina, con fecha y hora si se conocen. */
function cuandoInsulina(momento: 'noche_previa' | 'manana_intervencion', hora: string, fecha: number | null, t: TextosPaciente): string {
  const ins = t.med.insulina;
  if (fecha === null) return momento === 'noche_previa' ? ins.momento_noche : ins.momento_manana;
  const ep = epochToma(fecha, hora, momento);
  return momento === 'noche_previa'
    ? rellenar(ins.momento_noche_fecha, { fecha: fechaLarga(ep, t), hora: horaReloj(ep) })
    : rellenar(ins.momento_manana_fecha, { fecha: fechaLarga(ep, t), hora: horaReloj(ep) });
}

/** Texto localizado de un ajuste de insulina (§8.5). */
export function renderInsulina(ins: import('../../dominio/salidas/qr/hojaPaciente.ts').InsulinaQr, t: TextosPaciente, fecha: number | null): string {
  const p = t.med.insulina;
  if (ins.tipo === 'basal') {
    const partes = (ins.tomas ?? []).map((toma) =>
      rellenar(p.basal, { cuando: cuandoInsulina(toma.m, toma.h, fecha, t), d: toma.d, o: toma.o }),
    );
    return partes.join(' ');
  }
  if (ins.tipo === 'nph') {
    return capitalizar(rellenar(p.nph, {
      cuandoNoche: cuandoInsulina('noche_previa', ins.horaNoche ?? '21:00', fecha, t),
      noche: ins.nocheUi ?? 0,
      cuandoManana: cuandoInsulina('manana_intervencion', ins.horaManana ?? '08:00', fecha, t),
      manana: ins.mananaUi ?? 0,
      mananaOrig: ins.mananaOrig ?? 0,
    }));
  }
  if (ins.tipo === 'premezclada') {
    return capitalizar(rellenar(p.premezclada, {
      cuandoManana: cuandoInsulina('manana_intervencion', ins.horaManana ?? '08:00', fecha, t),
      manana: ins.mananaUi ?? 0,
      mananaOrig: ins.mananaOrig ?? 0,
    }));
  }
  return capitalizar(rellenar(p.rapida, {
    cuandoManana: cuandoInsulina('manana_intervencion', ins.horaDesayuno ?? '08:00', fecha, t),
  }));
}

/** Texto localizado de una instrucción de medicación. */
export function renderMed(instr: InstruccionPacienteEstructurada, t: TextosPaciente, telefono: string, fecha: number | null): string {
  const m = t.med;
  const e = instr.e;
  switch (e.k) {
    case 'confirmacion':
      return rellenar(m.confirmacion, { n: instr.nombre });
    case 'no_cumplible':
      // Si no hay teléfono configurado (§config), no se remite a un número que no aparece.
      return telefono.trim() === ''
        ? rellenar(m.no_cumplible_sin_tel, { n: instr.nombre })
        : rellenar(m.no_cumplible, { n: instr.nombre, tel: telefono });
    case 'mantener':
      return m[`mantener_${e.mv}` as 'mantener_oral'] ?? m.mantener_oral;
    case 'texto_fijo':
      // El texto libre solo existe en castellano; en catalán se usa el genérico
      // (§10.2, punto 4: la vista en catalán no muestra castellano).
      return t.idioma === 'ca' ? m.otro : e.tx;
    case 'no_dia_iq':
      return m.no_dia_iq;
    case 'insulina':
      return renderInsulina(e.ins, t, fecha);
    case 'margen':
      return e.margen.tipo === 'dias'
        ? rellenar(m.margen_dias, { n: e.margen.n })
        : rellenar(m.margen_horas, { n: e.margen.n });
    case 'suspender': {
      const fecha = fechaLarga(e.fecha, t);
      const hora = horaReloj(e.fecha);
      const base = e.adelantada && e.horaOriginal
        ? rellenar(m.suspender_adelantada, { fecha, hora, horaOriginal: e.horaOriginal })
        : rellenar(m.suspender_normal, { fecha, hora });
      const coletilla = e.margen.tipo === 'dias'
        ? rellenar(m.coletilla_dias, { n: e.margen.n })
        : rellenar(m.coletilla_horas, { n: e.margen.n });
      return `${base}${coletilla}`;
    }
  }
}

export interface LineaAyunoRender {
  etiqueta: string;
  cuando: string;
}

export interface AnexoRender {
  titulo: string;
  parrafos: string[];
}

/** Hojas anexas aplicables, ya localizadas (§8.14 bis). */
export function renderAnexos(ids: string[], fecha: number | null, t: TextosPaciente): AnexoRender[] {
  const a = t.anexos;
  const inicio = fecha !== null
    ? rellenar(a.inicio_con_fecha, { inicio: `${fechaLarga(fecha - 24 * 3_600_000, t)} a las ${horaReloj(fecha - 24 * 3_600_000)}` })
    : a.inicio_sin_fecha;
  const parrafosCon = (parr: string[]): string[] => parr.map((p) => rellenar(p, { inicio }));

  const out: AnexoRender[] = [];
  for (const id of ids) {
    if (id === 'liquida24h') {
      out.push({ titulo: a.liquida24h.titulo, parrafos: parrafosCon(a.liquida24h.parrafos) });
    } else if (id === 'liquida24h_diabetes') {
      out.push({ titulo: a.liquida24h.titulo, parrafos: [...parrafosCon(a.liquida24h.parrafos), ...a.diabetes_extra.parrafos] });
    } else if (id === 'ayuno_diabetico') {
      out.push({ titulo: a.ayuno_diabetico.titulo, parrafos: a.ayuno_diabetico.parrafos });
    } else if (id === 'tabaco') {
      out.push({ titulo: a.tabaco.titulo, parrafos: a.tabaco.parrafos });
    } else if (id === 'alcohol') {
      out.push({ titulo: a.alcohol.titulo, parrafos: a.alcohol.parrafos });
    }
  }
  return out;
}

/** Líneas de ayuno localizadas, con horas de reloj si hay fecha o «h antes» si no. */
export function renderAyuno(ay: AyunoQr, fecha: number | null, t: TextosPaciente): LineaAyunoRender[] {
  const a = t.ayuno;
  return ay.ln.map((l) => {
    const etiqueta = a.labels[l.c as 'comida_copiosa'] ?? l.c;
    let cuando: string;
    if (l.ha === 0 && l.hf === undefined) {
      cuando = a.sin_hora;
    } else if (fecha !== null) {
      if (l.hf !== undefined) {
        cuando = rellenar(a.rango, { a: horaReloj(fecha - l.hf * 3_600_000), b: horaReloj(fecha - l.ha * 3_600_000) });
      } else {
        cuando = rellenar(a.hasta, { hora: horaReloj(fecha - l.ha * 3_600_000) });
      }
    } else if (l.hf !== undefined) {
      cuando = rellenar(a.rango_antes, { a: l.ha, b: l.hf });
    } else {
      cuando = rellenar(a.antes, { n: l.ha });
    }
    return { etiqueta, cuando };
  });
}
