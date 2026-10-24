import { AlertBox, BackHeader, Disclaimer } from '../../components/ui'

/**
 * Las guías actuales (RCOG, SEGO) ya no recomiendan contar "10 movimientos":
 * lo importante es conocer el patrón propio del bebé y no esperar si cambia.
 */
export default function Kicks() {
  return (
    <div className="pb-24">
      <BackHeader title="¿Se mueve menos de lo normal?" subtitle="Movimientos del bebé en el embarazo" />

      <div className="px-5 mb-5">
        <AlertBox>
          <strong>Si notáis que se mueve menos de lo habitual, o deja de moverse, no esperéis al día siguiente.</strong>{' '}
          Llamad a la maternidad o id a urgencias de obstetricia ese mismo día, aunque sea de madrugada.
        </AlertBox>
      </div>

      <section className="px-5 mb-5 space-y-4 text-[15px] text-gray-700 leading-relaxed">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Lo normal</h2>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Los primeros movimientos se notan entre las semanas 16 y 24 (antes si no es el primer embarazo).</li>
            <li>Desde la semana 28 suele haber un patrón diario reconocible: momentos de más actividad y ratos de sueño.</li>
            <li>Los movimientos no disminuyen al final del embarazo: cambian de forma (menos patadas, más giros), pero siguen ahí.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Cómo comprobarlo</h2>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Tumbada de lado, en un rato tranquilo y a la hora en que suele estar activo.</li>
            <li>Lo que importa es compararlo con <strong>su</strong> patrón, no llegar a un número concreto.</li>
            <li>No uséis dopplers caseros para quedaros tranquilos: oír el latido no descarta un problema.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Tu papel</h2>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Pregúntale de vez en cuando cómo nota hoy al bebé.</li>
            <li>Si tiene dudas, apóyala para llamar: es una consulta frecuente y en maternidad prefieren veros.</li>
          </ul>
        </div>
      </section>

      <Disclaimer>Basado en las recomendaciones de SEGO y RCOG. No sustituye a tu matrona.</Disclaimer>
    </div>
  )
}
