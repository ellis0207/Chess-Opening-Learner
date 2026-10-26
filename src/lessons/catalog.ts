// The openings taught as lessons. scripts/build-lessons.ts grows each one into
// a tree of variations: you play `side`, the opponent plays every book reply
// after `moves`, and Stockfish picks your best answer and carries each line on
// to a middlegame position.
export type LessonSpec = {
  id: string
  name: string
  side: 'white' | 'black'
  group: string
  moves: string // the moves that define the opening, played in every variation
  description: string
  // Your moves to play where they are legal and about as good as the best:
  // keeps system openings (London, King's Indian Attack) on their setup.
  prefer?: string[]
  // Opponent move sequences, from the start, that belong to other lessons.
  exclude?: string[]
}

export const GROUPS = [
  'Open games (1.e4 e5) for White',
  'Queen’s pawn and flank openings for White',
  'Against the Sicilian (White)',
  'Defences to 1.e4 (Black)',
  'Sicilian Defence (Black)',
  'Defences to 1.e4 e5 (Black)',
  'Defences to 1.d4 (Black)',
] as const

export const CATALOG: LessonSpec[] = [
  // Open games for White
  {
    id: 'italian-game',
    name: 'Italian Game',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 Bc4',
    description:
      'One of the oldest openings. White aims the bishop at f7, Black’s weakest square, and builds a strong center with c3 and d4.',
  },
  {
    id: 'evans-gambit',
    name: 'Evans Gambit',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4',
    description:
      'A sharp Italian gambit: White gives up the b-pawn to gain time against the bishop on c5 and build a big center with c3 and d4.',
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 Bb5',
    description:
      'The Spanish Game. White pressures the knight that defends e5, building long-term pressure in the center. A favorite at every level.',
  },
  {
    id: 'scotch-game',
    name: 'Scotch Game',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 d4',
    description:
      'White opens the center at once with d4, trading the e5 pawn for free piece play and a space advantage.',
  },
  {
    id: 'four-knights',
    name: 'Four Knights Game',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6',
    description:
      'A classical, solid opening where both sides develop their knights first. Learn the Spanish and Scotch Four Knights ideas.',
  },
  {
    id: 'vienna-game',
    name: 'Vienna Game',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nc3',
    description:
      'White develops the queen’s knight first, keeping the option of a quick f4 to attack Black’s center.',
  },
  {
    id: 'kings-gambit',
    name: 'King’s Gambit',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 f4',
    description:
      'The romantic gambit: White offers the f-pawn to deflect Black’s e-pawn and open the f-file for an attack.',
  },
  {
    id: 'danish-gambit',
    name: 'Danish Gambit',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 d4 exd4 c3',
    description:
      'White sacrifices one or two pawns for a huge lead in development and two bishops raking toward Black’s king.',
  },
  {
    id: 'bishops-opening',
    name: 'Bishop’s Opening',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Bc4',
    description:
      'White develops the bishop to c4 straight away, keeping the knight and f-pawn flexible.',
  },
  {
    id: 'ponziani',
    name: 'Ponziani Opening',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nc6 c3',
    description:
      'White prepares d4 with c3, aiming for a broad pawn center. A surprise weapon with plenty of traps.',
  },
  {
    id: 'petrov-white',
    name: 'Against the Petrov',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 Nf6',
    description:
      'How to meet the Petrov (Russian) Defence as White, including the classical 3.Nxe5 and the sharp 3.d4.',
  },
  {
    id: 'philidor-white',
    name: 'Against the Philidor',
    side: 'white',
    group: GROUPS[0],
    moves: 'e4 e5 Nf3 d6',
    description:
      'Black defends e5 with a pawn. White grabs space with d4 and develops quickly to exploit Black’s passive setup.',
  },

  // Queen's pawn and flank openings for White
  {
    id: 'queens-gambit',
    name: 'Queen’s Gambit',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 d5 c4',
    description:
      'White offers the c-pawn to pull Black’s d-pawn away from the center. Learn how to answer the Declined, the Accepted, the Slav and every other reply.',
  },
  {
    id: 'london-system',
    name: 'London System',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 d5 Bf4',
    description:
      'A solid system: d4, Bf4, e3, Nf3, c3 and Bd3 against almost anything. Easy to learn, hard to crack.',
    prefer: ['Bf4', 'e3', 'Nf3', 'c3', 'Bd3', 'Nbd2', 'h3', 'O-O'],
  },
  {
    id: 'london-vs-nf6',
    name: 'London System against 1...Nf6',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 Nf6 Bf4',
    description:
      'The London setup against the Indian defences, where Black often fianchettoes or hits back with ...c5.',
    prefer: ['Bf4', 'e3', 'Nf3', 'c3', 'Bd3', 'Nbd2', 'h3', 'O-O'],
  },
  {
    id: 'catalan',
    name: 'Catalan Opening',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 Nf6 c4 e6 g3',
    description:
      'Queen’s Gambit meets fianchetto: the bishop on g2 presses on the long diagonal and on Black’s queenside.',
  },
  {
    id: 'trompowsky',
    name: 'Trompowsky Attack',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 Nf6 Bg5',
    description:
      'White pins or threatens to double Black’s pawns at move two, sidestepping a lot of Indian theory.',
  },
  {
    id: 'blackmar-diemer',
    name: 'Blackmar-Diemer Gambit',
    side: 'white',
    group: GROUPS[1],
    moves: 'd4 d5 e4',
    description:
      'An aggressive gambit: White gives a pawn for open lines and a fast attack on the f-file.',
  },
  {
    id: 'english',
    name: 'English Opening',
    side: 'white',
    group: GROUPS[1],
    moves: 'c4',
    description:
      'White controls d5 from the flank. Flexible and strategic, often turning into a reversed Sicilian.',
  },
  {
    id: 'reti',
    name: 'Réti Opening',
    side: 'white',
    group: GROUPS[1],
    moves: 'Nf3 d5 c4',
    description:
      'A hypermodern opening: White attacks the center from a distance with Nf3, c4 and a kingside fianchetto.',
  },
  {
    id: 'kings-indian-attack',
    name: 'King’s Indian Attack',
    side: 'white',
    group: GROUPS[1],
    moves: 'Nf3 d5 g3',
    description:
      'A system setup with Nf3, g3, Bg2, O-O, d3 and often e4, playable against almost everything.',
    prefer: ['Nf3', 'g3', 'Bg2', 'O-O', 'd3', 'Nbd2', 'e4', 'Re1'],
  },
  {
    id: 'bird',
    name: 'Bird Opening',
    side: 'white',
    group: GROUPS[1],
    moves: 'f4',
    description:
      'White grabs e5 with the f-pawn, a Dutch Defence with an extra tempo. Watch out for From’s Gambit.',
  },

  // Against the Sicilian (White)
  {
    id: 'open-sicilian',
    name: 'Open Sicilian',
    side: 'white',
    group: GROUPS[2],
    moves: 'e4 c5 Nf3',
    description:
      'The main way to fight the Sicilian: Nf3 and d4, opening the center. Meet the Najdorf, Dragon, Sveshnikov, Taimanov and the rest.',
  },
  {
    id: 'alapin',
    name: 'Alapin Sicilian',
    side: 'white',
    group: GROUPS[2],
    moves: 'e4 c5 c3',
    description:
      'White prepares d4 with c3 so a pawn, not a knight, recaptures on d4. A solid anti-Sicilian with a clear plan.',
  },
  {
    id: 'smith-morra',
    name: 'Smith-Morra Gambit',
    side: 'white',
    group: GROUPS[2],
    moves: 'e4 c5 d4 cxd4 c3',
    description:
      'White gives up a pawn for rapid development and open files against the Sicilian. Full of traps at club level.',
  },
  {
    id: 'closed-sicilian',
    name: 'Closed Sicilian',
    side: 'white',
    group: GROUPS[2],
    moves: 'e4 c5 Nc3',
    description:
      'White keeps the center closed and builds a kingside attack with g3, Bg2, f4 and Nf3.',
  },

  // Defences to 1.e4 (Black)
  {
    id: 'french',
    name: 'French Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 e6',
    description:
      'Black builds a solid chain with ...e6 and ...d5, then strikes at White’s center with ...c5. Learn the Advance, Exchange, Tarrasch, Winawer and more.',
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 c6',
    description:
      'A rock-solid defence: ...c6 and ...d5 challenge e4 while keeping the light-squared bishop free.',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 d5',
    description:
      'Black challenges e4 at once. After exd5 the queen recaptures, or Black gambits with ...Nf6.',
  },
  {
    id: 'pirc',
    name: 'Pirc Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 d6 d4 Nf6',
    description:
      'A hypermodern defence: Black lets White build a center, then attacks it with pieces and a kingside fianchetto.',
  },
  {
    id: 'modern',
    name: 'Modern Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 g6',
    description:
      'Black fianchettoes first and keeps the knight flexible, ready to hit White’s center with ...c5 or ...e5.',
  },
  {
    id: 'alekhine',
    name: 'Alekhine Defence',
    side: 'black',
    group: GROUPS[3],
    moves: 'e4 Nf6',
    description:
      'Black provokes White’s pawns forward with ...Nf6, then attacks the overextended center.',
  },

  // Sicilian Defence (Black)
  {
    id: 'najdorf',
    name: 'Sicilian Najdorf',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
    description:
      'The most famous Sicilian: the quiet ...a6 keeps White’s pieces off b5 and prepares ...e5 or ...e6. Learn the English Attack, 6.Bg5 and more.',
  },
  {
    id: 'dragon',
    name: 'Sicilian Dragon',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6',
    description:
      'Black fianchettoes the bishop on the long diagonal, the “Dragon”. Expect opposite-side castling and races.',
  },
  {
    id: 'sveshnikov',
    name: 'Sicilian Sveshnikov',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5',
    description:
      'Black plays ...e5, accepting a hole on d5 for active piece play and the bishop pair.',
  },
  {
    id: 'accelerated-dragon',
    name: 'Accelerated Dragon',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6',
    description:
      'A Dragon setup without ...d6, so Black can free the position with ...d5 in one move.',
  },
  {
    id: 'taimanov',
    name: 'Sicilian Taimanov',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6',
    description:
      'A flexible Sicilian with ...e6 and ...Nc6, keeping options for ...a6, ...Qc7 and ...Nf6.',
  },
  {
    id: 'kan',
    name: 'Sicilian Kan',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6',
    description:
      'Black plays ...e6 and ...a6, keeping the knights home and the setup flexible.',
  },
  {
    id: 'anti-sicilians',
    name: 'Anti-Sicilians as Black',
    side: 'black',
    group: GROUPS[4],
    moves: 'e4 c5',
    exclude: ['e4 c5 Nf3'],
    description:
      'What to do when White avoids the Open Sicilian: the Alapin, Closed, Grand Prix, Smith-Morra and other second moves.',
  },

  // Defences to 1.e4 e5 (Black)
  {
    id: 'two-knights',
    name: 'Two Knights Defence',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6',
    description:
      'Black counterattacks e4 against the Italian. Learn to survive the Fried Liver and handle 4.d3.',
  },
  {
    id: 'giuoco-piano-black',
    name: 'Giuoco Piano as Black',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
    description:
      'The classical answer to the Italian: develop the bishop to c5 and meet c3 with ...Nf6.',
  },
  {
    id: 'berlin',
    name: 'Berlin Defence',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6',
    description:
      'The “Berlin Wall”: a super-solid answer to the Ruy Lopez that counterattacks e4.',
  },
  {
    id: 'morphy-defence',
    name: 'Ruy Lopez Morphy Defence',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6',
    description:
      'The main line against the Ruy Lopez: ask the bishop with ...a6 and build the closed Spanish structures.',
  },
  {
    id: 'petrov',
    name: 'Petrov Defence',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nf6',
    description:
      'Black mirrors White and counterattacks e4. Solid and symmetrical, but beware the Stafford-like traps.',
  },
  {
    id: 'scotch-black',
    name: 'Scotch Game as Black',
    side: 'black',
    group: GROUPS[5],
    moves: 'e4 e5 Nf3 Nc6 d4',
    description:
      'Take on d4 and develop quickly. Learn the Classical (...Bc5) and Mieses (...Nf6) answers.',
  },

  // Defences to 1.d4 (Black)
  {
    id: 'qgd',
    name: 'Queen’s Gambit Declined',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 c4 e6',
    description:
      'Black holds d5 with ...e6. Classical and solid: learn the Orthodox, Exchange, Ragozin-style and Catalan-like lines.',
  },
  {
    id: 'qga',
    name: 'Queen’s Gambit Accepted',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 c4 dxc4',
    description:
      'Black takes the pawn and gives it back later in exchange for free development and play against White’s center.',
  },
  {
    id: 'slav',
    name: 'Slav Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 c4 c6',
    description:
      'Black supports d5 with ...c6, keeping the light-squared bishop free to come to f5 or g4.',
  },
  {
    id: 'semi-slav',
    name: 'Semi-Slav Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6',
    description:
      'Black combines ...c6 and ...e6, a rock-solid triangle with sharp ideas like the Meran and Botvinnik.',
  },
  {
    id: 'kings-indian',
    name: 'King’s Indian Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 g6 Nc3 Bg7',
    description:
      'Black lets White build a big center, then strikes back with ...e5 or ...c5 and often attacks on the kingside.',
  },
  {
    id: 'grunfeld',
    name: 'Grünfeld Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 g6 Nc3 d5',
    description:
      'Black hits the center with ...d5, trades knights and pressures the d4 pawn with the bishop on g7.',
  },
  {
    id: 'nimzo-indian',
    name: 'Nimzo-Indian Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 e6 Nc3 Bb4',
    description:
      'Black pins the c3 knight to fight for e4, often giving up the bishop pair to double White’s pawns.',
  },
  {
    id: 'queens-indian',
    name: 'Queen’s Indian Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 e6 Nf3 b6',
    description:
      'Black fianchettoes the queen’s bishop to control e4 and the long diagonal. Solid and strategic.',
  },
  {
    id: 'bogo-indian',
    name: 'Bogo-Indian Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 e6 Nf3 Bb4+',
    description:
      'A Nimzo-Indian cousin: Black checks with the bishop to disrupt White’s development.',
  },
  {
    id: 'dutch',
    name: 'Dutch Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 f5',
    description:
      'Black grabs e4 with the f-pawn and plays for a kingside attack. Learn the Leningrad, Stonewall and Classical ideas.',
  },
  {
    id: 'benoni',
    name: 'Modern Benoni',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 c5 d5 e6',
    description:
      'An unbalanced defence: Black gets a queenside majority and active pieces in return for space.',
  },
  {
    id: 'benko',
    name: 'Benko Gambit',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 c5 d5 b5',
    description:
      'Black gives a pawn for long-lasting pressure on the a- and b-files.',
  },
  {
    id: 'budapest',
    name: 'Budapest Gambit',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 Nf6 c4 e5',
    description:
      'A surprise gambit: Black hits d4 at once and usually wins the pawn back with active pieces.',
  },
  {
    id: 'tarrasch',
    name: 'Tarrasch Defence',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 c4 e6 Nc3 c5',
    description:
      'Black accepts an isolated d-pawn in return for free, active piece play.',
  },
  {
    id: 'london-black',
    name: 'Against the London',
    side: 'black',
    group: GROUPS[6],
    moves: 'd4 d5 Bf4',
    description:
      'How to meet the London System with ...c5, ...Nc6 and ...Qb6, hitting b2 and d4.',
  },
]
