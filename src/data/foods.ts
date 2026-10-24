/** Primeros alimentos para ir marcando desde los 6 meses. */

export interface FoodGroup {
  id: string
  title: string
  allergen?: boolean
  items: { id: string; name: string; tip?: string }[]
}

function f(id: string, title: string, items: [string, string?][], allergen = false): FoodGroup {
  return { id, title, allergen, items: items.map(([name, tip], i) => ({ id: `${id}${i + 1}`, name, tip })) }
}

export const FOOD_GROUPS: FoodGroup[] = [
  f('al', 'Alérgenos principales', [
    ['Huevo', 'Bien cocido. Empieza con una pequeña cantidad de yema y clara.'],
    ['Cacahuete', 'Siempre en crema diluida o en polvo, nunca entero.'],
    ['Frutos secos', 'Molidos o en crema (almendra, avellana, nuez). Nunca enteros antes de los 5-6 años.'],
    ['Pescado blanco', 'Merluza, bacalao, lenguado. Sin espinas.'],
    ['Pescado azul pequeño', 'Sardina, boquerón, salmón. Nada de pez espada, tiburón, atún rojo ni lucio.'],
    ['Marisco', 'Gamba, mejillón… bien cocinados. Evita cabezas de gamba y cuerpo de crustáceos (cadmio).'],
    ['Gluten (trigo)', 'Pan, pasta, sémola. En cantidades normales, sin prisa ni retraso.'],
    ['Leche de vaca', 'Como yogur natural o queso fresco. Como bebida principal, después del año.'],
    ['Soja', 'Tofu, edamame chafado.'],
    ['Sésamo', 'Tahini (crema de sésamo) en una tostada o en hummus.'],
  ], true),
  f('pr', 'Proteínas', [
    ['Pollo'], ['Pavo'], ['Ternera'], ['Cerdo magro'], ['Conejo'],
    ['Lentejas', 'Bien cocidas y chafadas.'], ['Garbanzos', 'Chafados o en hummus.'], ['Alubias'],
  ]),
  f('ve', 'Verduras', [
    ['Calabacín'], ['Calabaza'], ['Zanahoria', 'Cocida, en bastones blandos.'], ['Brócoli'], ['Coliflor'],
    ['Judía verde'], ['Patata'], ['Boniato'], ['Puerro'], ['Tomate'], ['Pimiento'], ['Berenjena'],
    ['Espinaca / acelga', 'Evitar antes del año (nitratos). De 1 a 3 años, como máximo una ración pequeña al día.'],
  ]),
  f('fr', 'Frutas', [
    ['Plátano'], ['Pera'], ['Manzana', 'Cocida o rallada: cruda y en trozos es dura.'], ['Melocotón'],
    ['Mango'], ['Naranja'], ['Fresa'], ['Sandía'], ['Melón'], ['Kiwi'],
    ['Uva', 'Siempre cortada en cuartos a lo largo.'], ['Aguacate'], ['Arándanos', 'Aplastados o cortados.'],
  ]),
  f('ce', 'Cereales y otros', [
    ['Arroz'], ['Avena'], ['Maíz'], ['Quinoa'], ['Pan', 'Sin sal añadida si es posible.'],
    ['Aceite de oliva virgen extra', 'El aceite de elección para cocinar y aliñar.'],
  ]),
]

export const FOOD_LIST_ID = 'alimentos'
