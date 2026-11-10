# Tatuś — Lista de mejoras sacada de la competencia

Fecha: 10-nov-2026

**De dónde sale.** Reseñas públicas de la App Store de iPhone (EE. UU., Reino Unido y España):
- ~7.000 reseñas recientes de 14 apps de embarazo, bebé y álbum familiar (What to Expect, BabyCenter, Embarazo+, The Bump, Wonder Weeks, Baby Tracker, Huckleberry, Tinybeans, BackThen, Qeepsake…).
- De ellas, las 719 de 1-2★ publicadas desde jun-2024.
- Además, ~40 apps de embarazo para padres o parejas (Daddy Up, HiDaddy, Big Daddy, DadGPT, Paternal, Labour, Bean…).

No incluye Google Play ni cifras de facturación.

## Lo que ya juega a favor de Tatuś (no tocar, sí contarlo)

- **Todo en el móvil, sin cuenta, sin anuncios, sin servidor.** Responde a tres de las cinco grandes quejas: muro de pago, venta de datos y "no puedo entrar en mi cuenta".
- **Pensada para el padre y en español.** La mayor app para padres (Daddy Up) tiene ~3.000 valoraciones y solo está en inglés. HiDaddy está traducida pero casi no se usa en España.
- **Guía + archivo para el hijo (Cartas del Futuro).** Ninguna app para padres tiene archivo. Las de recuerdos (Tinybeans, BackThen) no tienen guía y la gente se siente "secuestrada" pagando para no perder las fotos.
- **Fuentes oficiales españolas** (AEP, AEPap, Sanidad, AESAN, IHAN) en `src/data/sources.ts`.

## Lista priorizada

### P0 — Lo que más castiga a la competencia y Tatuś aún no resuelve

1. **Compartir con la pareja de verdad.**
   - *Queja:* "no sé cómo compartirla con mi mujer", "en su móvil nunca funcionó", "al sincronizar me borró los datos" (Baby Tracker, Huckleberry, Wonder Weeks, Tinybeans). Las apps para parejas mejor valoradas (Labour, Bean: todo 5★) destacan justo esto.
   - *Hoy:* hay motor de sincronización local (`src/sync/`), pero sin servidor ni pantallas.
   - *Propuesta:* emparejar dos móviles sin crear cuenta (QR o enlace) y que nunca se pierda nada al fusionar. Antes de anunciarlo, probarlo con dos móviles reales.
   - *Mínimo viable si el servidor tarda:* que ella pueda ver la semana actual en una tarjeta compartible. `shareCard` ya existe, pero hoy solo se usa en el diario.

2. **Que no se pierdan nunca los datos.**
   - *Queja:* "lo apunto y no se guarda", "se borró todo" (~95 reseñas). En una app local esto es aún más grave: si se borra el navegador, se pierden las cartas.
   - *Hoy:* la copia (backup) solo se hace a mano desde Ajustes. No se pide al navegador que no borre los datos: no hay `navigator.storage.persist()`.
   - *Propuesta:*
     - pedir `navigator.storage.persist()` al instalar;
     - recordar la copia cada X semanas, o tras N entradas nuevas;
     - mostrar la fecha de la última copia en Inicio;
     - comprobar que el backup importa bien antes de dar el aviso de "copia guardada".

### P1 — Diferencias claras frente a las apps de padres

3. **Tono serio y de tú a tú, ni de machote ni condescendiente.**
   - *Queja:* Daddy Up "hortera, da vergüenza ajena"; Paternal te trata como alguien que no ayuda ("friega la cocina sin que te lo pidan").
   - *Propuesta:* repasar `fatherTasks` y `partnerTips` en `src/data/prenatal_stages.json` y `stages.json` con esa regla. Dar datos concretos y útiles (citas, pruebas, papeleo, permiso de paternidad) en lugar de consejos de pareja obvios.

4. **Citar la fuente en cada semana del embarazo.**
   - *Queja:* contenido "genérico, lo mismo que en Google" y datos erróneos (medidas mal en Embarazo+).
   - *Hoy:* las fuentes existen, pero `PrenatalCard` no muestra ninguna.
   - *Propuesta:* enlazar en cada semana la fuente que respalda el dato.

5. **Modo pérdida gestacional.**
   - *Queja:* DadToBe — "no encuentro cómo indicar que hemos perdido al bebé; la app de mi mujer sí lo permitía".
   - *Hoy:* no existe.
   - *Propuesta:* una opción discreta en Ajustes que pare las semanas, oculte las compras y lleve a recursos de apoyo. Conservar el diario y las cartas si él quiere.

6. **La privacidad, dicha claramente.**
   - *Queja:* What to Expect y BabyCenter: "empecé a recibir correos de empresas que no conocía".
   - *Propuesta:* una frase en el onboarding y en Ajustes: "Tus datos no salen de tu móvil. Sin cuenta. Sin anuncios." Debe ser verdad siempre, también cuando llegue la sincronización.

### P2 — Si algún día se cobra

7. **Reglas de cobro para no repetir los errores ajenos** (~250 reseñas de muro de pago):
   - nunca cobrar por ver o exportar lo que el usuario ya ha guardado (cartas, fotos, diario);
   - nada de prueba "gratis" que cobra el primer día;
   - la guía semanal básica siempre gratis;
   - si hay pago, que sea por algo nuevo: la sincronización en la nube, el USB/libro físico de los 18 años…;
   - no cambiar las condiciones a quien ya paga (el gran enfado con Tinybeans).

8. **Actualizaciones sin sustos.**
   - *Queja:* Baby Tracker 5.0: rediseño, anuncios y una IA que no se podía quitar.
   - *Propuesta:* cambios grandes de diseño, opcionales o avisados. Nunca quitar funciones que la gente ya usa.

## Pendiente de investigar

- Google Play (Android): no revisado, y en España se usa mucho.
- Facturación real (Appfigures u otra fuente de pago).
- Hablar con 5-10 padres primerizos para confirmar el P0 antes de construir.
