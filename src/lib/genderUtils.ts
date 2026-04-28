/**
 * Inferência de sexo (M/F) a partir do primeiro nome em português brasileiro.
 * Heurística: lista curada de nomes comuns + regras de terminação.
 * Retorna 'M' | 'F' | null (quando não for possível inferir com segurança).
 */

const FEMININE_NAMES = new Set([
  'maria','ana','adriana','adelina','alessandra','alice','aline','amanda','amelia','andrea','angela','antonia',
  'beatriz','bianca','bruna','barbara','bia',
  'camila','carla','carolina','caroline','catarina','cecilia','celia','cintia','clara','claudia','cristina','cristiane','cristiana','cibele','cassia',
  'daniela','daniella','danielle','debora','denise','diana',
  'elaine','eliana','eliane','elisa','elisabete','elisangela','elizabete','eloa','emanuela','emily','erica','esther','eduarda','evelin','evelyn',
  'fabiana','fabiola','fatima','fernanda','flavia','francine','francisca',
  'gabriela','gabrielle','geovanna','giovana','giovanna','gisele','giselle','glaucia','graziela','graziella',
  'helena','heloisa',
  'iara','ingrid','irene','isabel','isabela','isabella','isadora','isis','ivana','ivone',
  'jaqueline','jacqueline','jade','janaina','janete','jenifer','jennifer','jessica','joana','joice','josefa','josiane','julia','juliana','julieta',
  'karen','karina','karla','katia','keila','keren','kelly',
  'larissa','laura','leticia','lia','liana','lidiane','ligia','lilian','liliane','lis','livia','lorena','luana','luciana','lucia','luciene','luiza','luisa','luna','lucinda',
  'magda','manuela','mara','marcela','marcia','margarida','mariana','marina','marisa','marta','melissa','mercia','michele','michelle','milena','mirela','monica','monique',
  'nadia','natalia','natascha','neide','nina','noemi','nayara','nayane',
  'olga','olivia',
  'patricia','paula','paulina','penelope','priscila','priscilla',
  'rafaela','raquel','rebeca','regiane','regina','renata','rita','roberta','rosa','rosana','rosangela','rosemary','rute','ruth',
  'sabrina','samanta','samantha','sandra','sara','sarah','selma','silvana','silvia','simone','sofia','solange','sonia','suelen','suellen','susana','silmara','sheila',
  'tais','tatiana','tatiane','tania','telma','teresa','thaina','thais','thaisa','thalita','tatiele','tamires',
  'valeria','valentina','vanessa','vania','vera','veronica','victoria','viviane','vitoria',
  'wanda','wanessa',
  'yara','yasmin','yolanda',
  'zelia','zilda',
]);

const MASCULINE_NAMES = new Set([
  'adao','adriano','adilson','agnaldo','alan','alberto','alex','alexandre','alfredo','altair','aluisio','amaury','andre','anderson','angelo','antonio','arnaldo','artur','arthur','augusto',
  'benedito','benjamin','bernardo','bruno',
  'caio','carlos','cassio','celso','cesar','cicero','claudio','clovis','cristiano','cristian',
  'daniel','dario','david','davi','dejair','denis','dennis','diego','diogo','douglas',
  'edgar','edilson','edmilson','edmundo','edson','eduardo','elias','eliseu','emanuel','emerson','enzo','erick','ericson','ernesto','estevao','everton','ezequiel',
  'fabiano','fabio','fabricio','felipe','felix','fernando','filipe','flavio','francisco',
  'gabriel','gean','geraldo','german','gilberto','gilmar','giovani','giovanni','gomes','gustavo','guilherme',
  'hamilton','helio','henrique','heitor','heber','hector','hugo','humberto',
  'igor','ismael','israel','italo','ivan','ivo',
  'jaime','jair','janderson','jean','jefferson','jeronimo','jesus','joao','joaquim','joel','jonas','jonatas','jorge','jose','josias','josue','juarez','julio','junior',
  'kaique','kauan','kevin',
  'lazaro','leandro','leonardo','leonel','leandro','levi','lincoln','lourenco','lucas','luciano','lucio','luis','luiz','luan',
  'manoel','manuel','marcelo','marcio','marco','marcos','mario','mateus','matheus','mauricio','mauro','maximo','michael','miguel','milton','moacir','moises','mateus',
  'natanael','nelson','neto','newton','nicolas','nilson','nilton','noel',
  'octavio','olavo','orlando','osmar','osvaldo','otavio',
  'pablo','paulo','pedro','percival','pietro','plinio',
  'rafael','raimundo','ramiro','ramon','raul','reginaldo','reinaldo','renan','renato','ricardo','rivelino','robert','roberto','rodolfo','rodrigo','rogerio','romario','romeu','romulo','ronaldo','ronan','ronnie','rudimar','rubens','rui',
  'samuel','sandro','sebastiao','sergio','silas','silvio','simao','sidney',
  'tales','tarcisio','tarso','teodoro','thiago','tiago','tito','tomas','tulio',
  'ulisses','ubirajara',
  'valdir','valdomiro','valentim','valter','vicente','victor','vinicius','vitor','vitorino',
  'walter','washington','wagner','wallace','wellington','wendel','wesley','weslley','wilson','willian','william',
  'yago','yuri',
  'zacarias','zeca',
]);

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function inferGender(fullName: string | null | undefined): 'M' | 'F' | null {
  if (!fullName) return null;
  const first = stripAccents(fullName).split(/\s+/)[0];
  if (!first) return null;

  if (FEMININE_NAMES.has(first)) return 'F';
  if (MASCULINE_NAMES.has(first)) return 'M';

  // Regras de terminação (heurística pt-BR)
  // Termina em 'a' geralmente é feminino; mas exceções: joshua, joaquina (já mapeados), nomes em -ssa/-ana/-ela costumam ser fem.
  if (/(a|ah|ana|ela|ila|ina|ssa|isa|inha|ette)$/.test(first)) return 'F';
  if (/(o|os|or|el|on|son|aldo|ardo|berto|inho|enrique|iel|uel|ael)$/.test(first)) return 'M';

  return null;
}

/**
 * Resolve sexo: usa o cadastrado (se existir) ou infere pelo nome.
 */
export function resolveGender(employee: { sexo?: string | null; nome?: string | null }): 'M' | 'F' | null {
  if (employee.sexo === 'M' || employee.sexo === 'F') return employee.sexo;
  return inferGender(employee.nome);
}
