// Fichas do álbum: uma curiosidade real sobre cada bicho, na ordem dos níveis.

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

// Conta quantas vezes cada bicho apareceu no quintal (solto ou nascido de uma junção).
export function see(meta, kind, level) {
  meta.seen ??= { cat: Array(10).fill(0), dog: Array(10).fill(0) };
  meta.seen[kind][level - 1]++;
}

export const timesSeen = (meta, kind, level) => meta.seen?.[kind]?.[level - 1] ?? 0;
