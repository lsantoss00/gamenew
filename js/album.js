// Fichas do álbum: uma curiosidade real sobre cada bicho, na ordem dos níveis.

import { getLang } from './i18n.js';

export const FACTS = {
  cat: [
    'Filhotes de gato nascem de olhos fechados e começam a abri-los por volta da segunda semana de vida.',
    'A maioria dos gatos laranja é macho: a cor laranja vem de um gene que fica no cromossomo X.',
    'Muitos gatos malhados têm um desenho em forma de M na testa.',
    'Os siameses nascem quase brancos. As pontas escuras aparecem com o tempo, nas partes mais frias do corpo: orelhas, focinho, patas e rabo.',
    'O persa tem pelo longo e cara achatada, e precisa ser escovado com frequência para o pelo não embolar.',
    'Os tufos de pelo nas pontas das orelhas são a marca registrada do lince.',
    'A jaguatirica vive nas Américas, inclusive no Brasil, e caça principalmente à noite.',
    'A pantera-negra não é uma espécie à parte: é uma onça ou um leopardo de pelagem escura, e as pintas ainda aparecem sob a luz.',
    'As listras do tigre ficam também na pele, não só no pelo, e nenhum tigre tem o desenho igual ao de outro.',
    'O leão é o felino mais sociável: vive em grupo, e o rugido dele pode ser ouvido a quilômetros de distância.',
  ],
  dog: [
    'Filhotes de cachorro nascem sem enxergar e sem ouvir; os olhos abrem por volta de duas semanas de vida.',
    'O vira-lata caramelo é tão comum nas ruas do Brasil que virou um símbolo popular do país.',
    'O dachshund foi criado na Alemanha para entrar em tocas de texugo: o nome quer dizer "cão-texugo".',
    'O faro do beagle é tão bom que a raça é usada em aeroportos para encontrar alimentos escondidos nas malas.',
    'O border collie é famoso por pastorear ovelhas e costuma aparecer entre as raças mais inteligentes.',
    'O husky siberiano foi criado para puxar trenós no frio, e é comum ter olhos azuis ou um de cada cor.',
    'O pastor-alemão é muito usado pela polícia e em resgates, pelo faro apurado e pela facilidade de aprender.',
    'O dobermann leva o nome de Louis Dobermann, um cobrador de impostos alemão que criou a raça no fim do século 19.',
    'O são-bernardo ficou famoso resgatando viajantes perdidos na neve dos Alpes suíços.',
    'Os cachorros descendem de lobos domesticados há milhares de anos.',
  ],
};

const FACTS_BY_LANG = {
  en: {
    cat: [
      'Kittens are born with their eyes closed and start opening them at around two weeks old.',
      'Most ginger cats are male: the gene for orange fur sits on the X chromosome.',
      'Many tabby cats have an M-shaped marking on their forehead.',
      'Siamese cats are born almost white. The dark points appear over time on the coolest parts of the body: ears, face, paws and tail.',
      'The Persian has long fur and a flat face, and needs frequent brushing so its coat does not mat.',
      'The tufts of fur on the tips of its ears are the lynx\'s trademark.',
      'The ocelot lives in the Americas, including Brazil, and hunts mostly at night.',
      'The black panther is not a species of its own: it is a jaguar or leopard with a dark coat, and its spots still show in the light.',
      'A tiger\'s stripes are on its skin as well as its fur, and no two tigers have the same pattern.',
      'The lion is the most social of the big cats: it lives in groups, and its roar can be heard kilometres away.',
    ],
    dog: [
      'Puppies are born unable to see or hear; their eyes open at around two weeks old.',
      'The caramel-coloured mutt is so common on Brazil\'s streets that it has become a popular symbol of the country.',
      'The dachshund was bred in Germany to go into badger burrows: its name means "badger dog".',
      'The beagle\'s nose is so good that the breed is used at airports to find food hidden in luggage.',
      'The border collie is famous for herding sheep and often ranks among the most intelligent breeds.',
      'The Siberian husky was bred to pull sleds in the cold, and it often has blue eyes or one eye of each colour.',
      'The German shepherd is widely used by police and in rescues, thanks to its keen nose and how easily it learns.',
      'The Dobermann is named after Louis Dobermann, a German tax collector who created the breed in the late 19th century.',
      'The Saint Bernard became famous for rescuing travellers lost in the snow of the Swiss Alps.',
      'Dogs descend from wolves that were domesticated thousands of years ago.',
    ],
  },
  es: {
    cat: [
      'Los gatitos nacen con los ojos cerrados y empiezan a abrirlos hacia la segunda semana de vida.',
      'La mayoría de los gatos anaranjados son machos: el gen del color naranja está en el cromosoma X.',
      'Muchos gatos atigrados tienen un dibujo en forma de M en la frente.',
      'Los siameses nacen casi blancos. Las puntas oscuras aparecen con el tiempo en las partes más frías del cuerpo: orejas, hocico, patas y cola.',
      'El persa tiene el pelo largo y la cara chata, y necesita cepillados frecuentes para que no se le enrede el pelo.',
      'Los mechones de pelo en la punta de las orejas son la marca del lince.',
      'El ocelote vive en América, también en Brasil, y caza sobre todo de noche.',
      'La pantera negra no es una especie aparte: es un jaguar o un leopardo de pelaje oscuro, y sus manchas se ven a contraluz.',
      'Las rayas del tigre también están en la piel, no solo en el pelo, y no hay dos tigres con el mismo dibujo.',
      'El león es el felino más sociable: vive en grupo, y su rugido se oye a kilómetros de distancia.',
    ],
    dog: [
      'Los cachorros nacen sin ver ni oír; abren los ojos hacia las dos semanas de vida.',
      'El perro mestizo color caramelo es tan común en las calles de Brasil que se volvió un símbolo popular del país.',
      'El dachshund se crió en Alemania para meterse en las madrigueras de tejones: su nombre significa "perro tejonero".',
      'El olfato del beagle es tan bueno que la raza se usa en aeropuertos para encontrar alimentos escondidos en las maletas.',
      'El border collie es famoso por pastorear ovejas y suele estar entre las razas más inteligentes.',
      'El husky siberiano se crió para tirar de trineos en el frío, y es común que tenga ojos azules o uno de cada color.',
      'El pastor alemán se usa mucho en la policía y en rescates, por su gran olfato y lo fácil que aprende.',
      'El dóberman lleva el nombre de Louis Dobermann, un recaudador de impuestos alemán que creó la raza a finales del siglo XIX.',
      'El san bernardo se hizo famoso rescatando a viajeros perdidos en la nieve de los Alpes suizos.',
      'Los perros descienden de lobos domesticados hace miles de años.',
    ],
  },
};

export const factOf = (kind, level) => (FACTS_BY_LANG[getLang()] ?? FACTS)[kind][level - 1];

// Conta quantas vezes cada bicho apareceu no quintal (solto ou nascido de uma junção).
export function see(meta, kind, level) {
  meta.seen ??= { cat: Array(10).fill(0), dog: Array(10).fill(0) };
  meta.seen[kind][level - 1]++;
}

export const timesSeen = (meta, kind, level) => meta.seen?.[kind]?.[level - 1] ?? 0;
