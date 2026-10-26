// Short descriptions of named openings and variations, shown when the
// opponent steers into one. Keys are names from the Lichess openings dataset
// or the start of one; the longest key that starts a name wins, so a family
// note covers every variation without its own.
const NOTES: Record<string, string> = {
  // 1.e4 e5
  'Italian Game':
    'White’s bishop eyes f7 while c3 and d4 prepare a big center.',
  'Italian Game: Giuoco Piano':
    'The “quiet game”: both bishops on c5 and c4. White plans c3 and d4, or a slow buildup with d3.',
  'Italian Game: Giuoco Pianissimo':
    'White plays a slow d3 setup, keeping the tension and maneuvering before striking.',
  'Italian Game: Two Knights Defense':
    'Black counterattacks e4 instead of guarding it. Sharp play follows if White goes for f7 with Ng5.',
  'Italian Game: Two Knights Defense, Fried Liver Attack':
    'White sacrifices the knight on f7 to drag Black’s king into the open.',
  'Italian Game: Two Knights Defense, Traxler Counterattack':
    'Black ignores the threat to f7 and counterattacks f2 with ...Bc5. Very sharp.',
  'Italian Game: Evans Gambit':
    'White gives up the b-pawn to gain time against the bishop on c5 and build a center with c3 and d4.',
  'Italian Game: Hungarian Defense':
    'Black plays a modest ...Be7, avoiding sharp lines at the cost of some activity.',
  'Italian Game: Paris Defense':
    'Black defends e5 with ...d6, a solid but passive setup.',
  'Italian Game: Blackburne-Kostić Gambit':
    'A trappy line: ...Nd4 offers the e5 pawn, hoping for Nxe5?? Qg5!',
  'Italian Game: Anti-Fried Liver Defense':
    'Black plays ...h6 to keep White’s knight out of g5.',
  'Ruy Lopez':
    'The bishop pins the knight that defends e5, building long-term pressure on Black’s center.',
  'Ruy Lopez: Morphy Defense':
    'Black asks the bishop with ...a6. The main line of the Spanish, leading to rich closed structures.',
  'Ruy Lopez: Berlin Defense':
    'Black counterattacks e4 with ...Nf6. Super-solid; the endgame lines are famous for being hard to crack.',
  'Ruy Lopez: Exchange Variation':
    'White takes on c6, doubling Black’s pawns and aiming for a better endgame.',
  'Ruy Lopez: Closed':
    'The classic closed Spanish: both sides maneuver behind locked pawns before breaking with d4 or ...f5.',
  'Ruy Lopez: Marshall Attack':
    'Black gives a pawn with ...d5 for a fierce attack on White’s king.',
  'Ruy Lopez: Open':
    'Black grabs the e4 pawn with ...Nxe4 and gets free, active pieces.',
  'Ruy Lopez: Schliemann Defense':
    'An aggressive counter-gambit: Black strikes with ...f5 at once.',
  'Ruy Lopez: Classical Variation':
    'Black develops the bishop to c5, an active and direct setup.',
  'Ruy Lopez: Steinitz Defense':
    'Black defends e5 with ...d6, solid but cramped.',
  'Ruy Lopez: Cozio Defense':
    'Black develops the knight to e7, keeping the option of ...g6.',
  'Ruy Lopez: Bird Variation':
    'Black jumps to d4 to trade knights, an old and slightly dubious idea.',
  'Scotch Game':
    'White opens the center with d4 and trades the e5 pawn for free piece play.',
  'Scotch Game: Classical Variation':
    'Black develops the bishop to c5, hitting the knight on d4.',
  'Scotch Game: Schmidt Variation':
    'Black develops with ...Nf6, attacking e4. Leads to the Mieses lines after Nxc6.',
  'Scotch Game: Scotch Gambit':
    'White develops instead of recapturing on d4, offering a pawn for quick play.',
  'Four Knights Game':
    'Both sides develop their knights first. Symmetrical, classical and solid.',
  'Four Knights Game: Spanish Variation':
    'White pins the c6 knight with Bb5, a Ruy Lopez with both knights out.',
  'Four Knights Game: Scotch Variation': 'White opens the center with d4.',
  'Vienna Game': 'White develops the queen’s knight and keeps f4 in reserve.',
  'Vienna Game: Vienna Gambit':
    'White plays f4, a King’s Gambit with an extra knight developed.',
  "King's Gambit":
    'White offers the f-pawn to open the f-file and take the center.',
  "King's Gambit Accepted":
    'Black takes the pawn. White aims for quick development and pressure on f7.',
  "King's Gambit Declined":
    'Black refuses the pawn, usually with ...Bc5 or ...d5.',
  "King's Gambit Declined: Falkbeer Countergambit":
    'Black strikes back with ...d5, opening the center at once.',
  'Danish Gambit': 'White gives pawns away for a huge lead in development.',
  "Bishop's Opening":
    'White develops the bishop to c4 first, keeping the knight and f-pawn flexible.',
  'Ponziani Opening': 'White prepares d4 with c3, aiming for a broad center.',
  "Petrov's Defense":
    'Black counterattacks e4 instead of defending e5. Solid and symmetrical.',
  "Petrov's Defense: Stafford Gambit":
    'A trappy gambit: Black gives the e5 pawn for quick piece play and tricks against White’s king.',
  'Philidor Defense': 'Black defends e5 with ...d6: solid but passive.',
  'Latvian Gambit': 'A wild counter-gambit with ...f5. Risky for Black.',
  'Elephant Gambit': 'Black hits back with ...d5, a speculative gambit.',
  'Center Game':
    'White recaptures on d4 with the queen, gaining space but losing time to ...Nc6.',
  'Three Knights Opening':
    'Black avoids symmetry by not playing ...Nf6 at once.',

  // Sicilian
  'Sicilian Defense':
    'Black fights for d4 with the c-pawn, making the game unbalanced from move one.',
  'Sicilian Defense: Najdorf Variation':
    'The quiet ...a6 keeps White’s pieces off b5 and prepares ...e5 or ...e6.',
  'Sicilian Defense: Najdorf Variation, English Attack':
    'White plays Be3, f3, Qd2 and O-O-O, then storms the kingside with g4.',
  'Sicilian Defense: Dragon Variation':
    'Black fianchettoes on g7. Opposite-side castling and pawn storms are typical.',
  'Sicilian Defense: Dragon Variation, Yugoslav Attack':
    'White castles long and pushes h4-h5 to open the h-file against the Dragon king.',
  'Sicilian Defense: Accelerated Dragon':
    'A Dragon setup without ...d6, so Black can free the game with ...d5 in one go.',
  'Sicilian Defense: Accelerated Dragon, Maróczy Bind':
    'White clamps d5 with c4 and e4, a bind that limits Black’s counterplay.',
  'Sicilian Defense: Lasker-Pelikan Variation':
    'Black plays ...e5, accepting a hole on d5 for active pieces.',
  'Sicilian Defense: Lasker-Pelikan Variation, Sveshnikov Variation':
    'The modern main line of ...e5: Black gets the bishop pair and dynamic play against a hole on d5.',
  'Sicilian Defense: Taimanov Variation':
    'Black plays ...e6 and ...Nc6, flexible and hard to target.',
  'Sicilian Defense: Kan Variation':
    'Black plays ...e6 and ...a6, keeping the setup fluid.',
  'Sicilian Defense: Scheveningen Variation':
    'A small center with ...d6 and ...e6: compact and resilient.',
  'Sicilian Defense: Classical Variation':
    'Black develops with ...Nc6 and ...d6. White often answers with Bg5 (the Richter-Rauzer).',
  'Sicilian Defense: Alapin Variation':
    'White prepares d4 with c3 so that a pawn, not a knight, recaptures.',
  'Sicilian Defense: Closed':
    'White keeps the center closed and plays on the kingside with g3, f4 and Nf3.',
  'Sicilian Defense: Smith-Morra Gambit':
    'White sacrifices a pawn for quick development and open files.',
  'Sicilian Defense: Smith-Morra Gambit Accepted':
    'Black takes the second pawn. Precise defence is needed against White’s fast development.',
  'Sicilian Defense: Smith-Morra Gambit Declined':
    'Black declines the gambit, often with ...d3 or ...Nf6, steering into quieter play.',
  'Sicilian Defense: Grand Prix Attack':
    'White plays f4 and Bc4 or Bb5, aiming for a kingside attack.',
  'Sicilian Defense: Moscow Variation':
    'White checks with Bb5+, aiming for quick development and a quieter game.',
  'Sicilian Defense: Wing Gambit':
    'White offers the b-pawn to deflect Black’s c-pawn from the center.',
  'Sicilian Defense: Old Sicilian':
    'Black develops with ...Nc6 before choosing a setup.',
  'Sicilian Defense: Four Knights Variation':
    'Black develops both knights and plans ...Bb4 or ...e5 depending on White.',
  'Sicilian Defense: Nyezhmetdinov-Rossolimo Attack':
    'White pins the knight with Bb5 to fight for d5 and spoil Black’s pawns.',
  'Sicilian Defense: Hyperaccelerated Dragon':
    'Black fianchettoes at once with ...g6, keeping ...d6 in reserve.',
  'Sicilian Defense: Bowdler Attack':
    'White develops the bishop to c4 early, aiming at f7.',
  'Sicilian Defense: McDonnell Attack':
    'White plays an early f4, building toward a kingside attack.',
  'Sicilian Defense: Delayed Alapin Variation':
    'White plays c3 after Nf3, preparing d4.',

  // Other 1.e4 defences
  'French Defense':
    'Black builds a pawn chain with ...e6 and ...d5, then attacks White’s center with ...c5 and ...f6.',
  'French Defense: Advance Variation':
    'White closes the center with e5. Black attacks the chain with ...c5 and ...Qb6.',
  'French Defense: Exchange Variation':
    'White takes on d5, giving a symmetrical structure and an open game.',
  'French Defense: Tarrasch Variation':
    'White plays Nd2, avoiding the pin ...Bb4 and keeping c3 free for the pawn.',
  'French Defense: Winawer Variation':
    'Black pins the knight with ...Bb4. Sharp play with doubled pawns and opposite plans.',
  'French Defense: Classical Variation':
    'Black develops with ...Nf6, inviting White to push e5 or pin with Bg5.',
  'French Defense: Rubinstein Variation':
    'Black takes on e4 with ...dxe4, a solid line that frees the game.',
  "French Defense: King's Indian Attack":
    'White sets up with d3, Nd2, Ngf3, g3 and Bg2, aiming for a kingside attack.',
  'French Defense: Normal Variation':
    'Black plays ...d5 at once, the classical way to challenge e4.',
  'French Defense: Two Knights Variation':
    'White develops both knights, a flexible but less ambitious setup.',
  'French Defense: Knight Variation':
    'White develops Nf3 before d4, keeping options open.',
  'French Defense: Steinitz Attack': 'White gains space with e5 early.',
  'French Defense: La Bourdonnais Variation':
    'White plays f4, an aggressive attempt to grab space.',
  'Caro-Kann Defense':
    'Black supports ...d5 with ...c6, solid and sound, keeping the light-squared bishop free.',
  'Caro-Kann Defense: Advance Variation':
    'White gains space with e5. Black usually develops the bishop to f5 before ...e6.',
  'Caro-Kann Defense: Exchange Variation':
    'White trades on d5 for a symmetrical structure; the fight is about the e4 and e5 squares.',
  'Caro-Kann Defense: Panov Attack':
    'White plays c4, leading to isolated-pawn positions with active pieces.',
  'Caro-Kann Defense: Classical Variation':
    'After ...dxe4 Black develops the bishop to f5 and builds a solid position.',
  'Caro-Kann Defense: Karpov Variation':
    'Black plays ...Nd7 to challenge White’s knight with ...Ngf6, solid and resilient.',
  'Caro-Kann Defense: Two Knights Attack':
    'White develops both knights before committing the center.',
  'Caro-Kann Defense: Accelerated Panov Attack':
    'White plays c4 early, hitting d5 before Black is ready.',
  'Caro-Kann Defense: Bronstein-Larsen Variation':
    'Black accepts doubled f-pawns for open lines and active play.',
  'Caro-Kann Defense: Main Line':
    'Black takes on e4 and develops the light-squared bishop, the classical approach.',
  'Caro-Kann Defense: Hillbilly Attack':
    'White plays Bc4, an offbeat line inviting tactics.',
  'Scandinavian Defense': 'Black challenges e4 at once with ...d5.',
  'Scandinavian Defense: Mieses-Kotroc Variation':
    'Black recaptures with the queen and retreats to a5, d6 or d8.',
  'Scandinavian Defense: Modern Variation':
    'Black recaptures on d5 with the knight instead of the queen.',
  'Scandinavian Defense: Main Line':
    'The queen goes to a5 after Nc3, pinning and staying active.',
  'Scandinavian Defense: Icelandic-Palme Gambit':
    'Black gambits with ...e6 for quick development.',
  'Pirc Defense':
    'Black lets White build a center, then attacks it from the side.',
  'Pirc Defense: Austrian Attack':
    'White plays f4, the most aggressive setup against the Pirc.',
  'Pirc Defense: Classical Variation':
    'White develops quietly with Nf3 and Be2.',
  'Pirc Defense: 150 Attack':
    'White plays Be3, Qd2 and Bh6 to trade Black’s fianchettoed bishop and attack.',
  'Modern Defense': 'Black fianchettoes first and keeps the knights flexible.',
  'Alekhine Defense':
    'Black provokes White’s pawns forward, then attacks the stretched center.',
  'Alekhine Defense: Four Pawns Attack':
    'White grabs the center with four pawns. Black must hit back fast.',
  'Alekhine Defense: Modern Variation':
    'White supports the center calmly with Nf3.',
  'Alekhine Defense: Exchange Variation':
    'White trades on d6, aiming for a small space edge.',
  'Nimzowitsch Defense':
    'Black develops ...Nc6 first, an offbeat but playable choice.',
  'Owen Defense': 'Black fianchettoes the queen’s bishop with ...b6.',

  // 1.d4
  "Queen's Gambit":
    'White offers the c-pawn to pull Black’s d-pawn from the center.',
  "Queen's Gambit Declined":
    'Black holds d5 with ...e6. Classical, solid and hard to break.',
  "Queen's Gambit Declined: Orthodox Defense":
    'The old main line: ...Be7, ...O-O and ...Nbd7, then freeing with ...c5 or ...e5.',
  "Queen's Gambit Declined: Exchange Variation":
    'White takes on d5 and often plays the minority attack with b4-b5.',
  "Queen's Gambit Declined: Lasker Defense":
    'Black trades pieces with ...Ne4 to ease the defence.',
  "Queen's Gambit Declined: Tartakower Defense":
    'Black plays ...b6 and ...Bb7, a solid and respected setup.',
  "Queen's Gambit Declined: Cambridge Springs Defense":
    'Black pins with ...Qa5, combining pressure on c3 with tactics on the long diagonal.',
  "Queen's Gambit Declined: Ragozin Defense":
    'Black plays ...Bb4, a Nimzo-Indian style pin.',
  "Queen's Gambit Declined: Semi-Tarrasch Defense":
    'Black plays ...c5 and recaptures on d5 with a piece, avoiding an isolated pawn.',
  "Queen's Gambit Declined: Albin Countergambit":
    'Black strikes with ...e5, giving a pawn for a wedge on d4 and quick play.',
  "Queen's Gambit Declined: Chigorin Defense":
    'Black develops ...Nc6 and gives up the bishop pair for piece play.',
  "Queen's Gambit Declined: Baltic Defense":
    'Black develops the bishop to f5 before playing ...e6.',
  "Queen's Gambit Declined: Marshall Defense":
    'Black plays ...Nf6 without supporting d5. Dubious but tricky.',
  "Queen's Gambit Declined: Harrwitz Attack":
    'White develops the bishop to f4 instead of g5.',
  "Queen's Gambit Declined: Three Knights Variation":
    'A flexible move order keeping ...Bb4 and ...c5 ideas.',
  "Queen's Gambit Declined: Pseudo-Tarrasch Variation":
    'Black hits the center with ...c5 after White’s Bg5.',
  "Queen's Gambit Declined: Janowski Variation":
    'Black plays ...a6, an offbeat waiting move.',
  "Queen's Gambit Declined: Austrian Defense":
    'Black meets c4 with a symmetrical ...c5.',
  "Queen's Gambit Declined: Manhattan Variation":
    'Black pins with ...Bb4 after ...Nbd7.',
  "Queen's Gambit Accepted":
    'Black takes the c4 pawn, planning to give it back for free development and play against the center.',
  "Queen's Gambit Accepted: Classical Defense":
    'Black develops with ...Nf6, ...e6 and ...c5, a sound modern main line.',
  "Queen's Gambit Accepted: Central Variation":
    'White grabs the center with e4 at once.',
  "Queen's Gambit Accepted: Old Variation":
    'Black tries to hold the pawn with ...b5, which usually backfires.',
  "Queen's Gambit Accepted: Alekhine Defense":
    'Black plays ...a6, preparing ...b5.',
  'Slav Defense':
    'Black supports d5 with ...c6 and keeps the light-squared bishop free for f5 or g4.',
  'Slav Defense: Czech Variation':
    'Black takes on c4, then develops the bishop to f5 after White’s a4.',
  'Slav Defense: Exchange Variation':
    'White takes on d5, giving a symmetrical, drawish-looking but subtle structure.',
  'Slav Defense: Chebanenko Variation':
    'Black plays ...a6, preparing ...b5 and keeping all options.',
  'Slav Defense: Quiet Variation':
    'White plays e3, protecting c4 and avoiding the main-line tactics.',
  'Slav Defense: Modern Line': 'White plays Nc3 and Nf3, the main line.',
  'Slav Defense: Schlechter Variation':
    'Black fianchettoes with ...g6, a Grünfeld-Slav hybrid.',
  'Slav Defense: Winawer Countergambit':
    'Black strikes with ...e5, a speculative gambit.',
  'Semi-Slav Defense':
    'Black combines ...c6 and ...e6: very solid, with sharp ideas like ...dxc4 and ...b5.',
  'Semi-Slav Defense: Meran Variation':
    'Black takes on c4 and expands with ...b5, ...Bb7 and ...a6 on the queenside.',
  'Semi-Slav Defense: Botvinnik Variation':
    'A razor-sharp line: Black takes on c4 and holds on with ...b5, ...h6 and ...g5.',
  'Semi-Slav Defense: Anti-Moscow Gambit':
    'White gives a pawn with e4 for fast development.',
  'Semi-Slav Defense: Moscow Variation':
    'Black takes the bishop pair with ...Bxf6 after ...h6.',
  'Semi-Slav Defense: Marshall Gambit':
    'White sacrifices the d-pawn with e4 for a lead in development.',
  'Semi-Slav Defense: Stoltz Variation': 'White plays Qc2, a quieter approach.',
  "King's Indian Defense":
    'Black fianchettoes and lets White take the center, then strikes back with ...e5 or ...c5.',
  "King's Indian Defense: Orthodox Variation":
    'The main line with Be2 and O-O. After ...e5 and d5, both sides attack on opposite wings.',
  "King's Indian Defense: Sämisch Variation":
    'White plays f3, securing e4 and preparing Be3, Qd2 and a kingside pawn storm.',
  "King's Indian Defense: Four Pawns Attack":
    'White grabs the center with four pawns. Black must hit back fast with ...c5.',
  "King's Indian Defense: Fianchetto Variation":
    'White fianchettoes too, a quiet but solid approach.',
  "King's Indian Defense: Averbakh Variation":
    'White plays Be2 and Bg5, discouraging ...e5.',
  "King's Indian Defense: Petrosian Variation":
    'White closes the center with d5 and pins with Bg5.',
  "King's Indian Defense: Normal Variation":
    'The classical setup with Nf3 and Be2.',
  'Grünfeld Defense':
    'Black hits the center with ...d5, trades knights and attacks d4 with the g7 bishop and ...c5.',
  'Grünfeld Defense: Exchange Variation':
    'White builds a big center with e4 and c3. Black attacks it with ...c5 and ...Nc6.',
  'Grünfeld Defense: Russian Variation': 'White plays Qb3 to pressure d5.',
  'Grünfeld Defense: Three Knights Variation':
    'White develops Nf3, keeping more pieces on the board.',
  'Grünfeld Defense: Brinckmann Attack': 'White plays Bf4, pressuring c7.',
  'Nimzo-Indian Defense':
    'Black pins the c3 knight to fight for e4, often giving up the bishop pair to double White’s pawns.',
  'Nimzo-Indian Defense: Classical Variation':
    'White plays Qc2 to recapture on c3 with the queen and avoid doubled pawns.',
  'Nimzo-Indian Defense: Rubinstein System':
    'White plays e3, a solid and flexible setup.',
  'Nimzo-Indian Defense: Normal Variation':
    'White plays e3 and develops, the most common setup.',
  'Nimzo-Indian Defense: Sämisch Variation':
    'White forces the bishop trade with a3, accepting doubled pawns for the bishop pair.',
  'Nimzo-Indian Defense: Leningrad Variation': 'White pins with Bg5.',
  "Queen's Indian Defense":
    'Black fianchettoes the queen’s bishop to control e4.',
  "Queen's Indian Defense: Fianchetto Variation":
    'White fianchettoes too, contesting the long diagonal.',
  "Queen's Indian Defense: Petrosian Variation":
    'White plays a3 to stop ...Bb4.',
  'Bogo-Indian Defense':
    'Black checks with ...Bb4+ to disrupt White’s development.',
  'Dutch Defense': 'Black grabs e4 with ...f5 and plays for a kingside attack.',
  'Dutch Defense: Leningrad Variation':
    'Black fianchettoes with ...g6, a King’s Indian with ...f5.',
  'Dutch Defense: Stonewall Variation':
    'Black sets pawns on c6, d5, e6 and f5, a rock-solid wall with a hole on e5.',
  'Dutch Defense: Classical Variation':
    'Black plays ...e6 and ...d6, flexible and solid.',
  'Dutch Defense: Staunton Gambit':
    'White gambits a pawn with e4 to punish ...f5.',
  'Benoni Defense':
    'Black gets a queenside majority and active pieces in return for space.',
  'Benoni Defense: Modern Variation':
    'Black plays ...e6 and ...exd5 for an unbalanced, dynamic structure.',
  'Benko Gambit': 'Black gives a pawn for long-lasting queenside pressure.',
  'Benko Gambit Accepted':
    'White takes the pawn. Black gets open a- and b-files for the rooks.',
  'Indian Defense: Budapest Gambit':
    'Black hits d4 at once with ...e5, regaining the pawn with active pieces.',
  'Tarrasch Defense': 'Black accepts an isolated d-pawn for free, active play.',
  'Catalan Opening':
    'White fianchettoes with g3, pressing on the long diagonal and the queenside.',
  'Catalan Opening: Open Defense':
    'Black takes on c4 and tries to hold the pawn or free the game.',
  'Catalan Opening: Closed':
    'Black keeps the center closed with ...Be7, a solid and strategic line.',
  'Trompowsky Attack':
    'White develops Bg5 at once, threatening to double Black’s pawns.',
  'Blackmar-Diemer Gambit':
    'White gambits a pawn with e4 for open lines and rapid attack.',
  'Blackmar-Diemer Gambit Accepted':
    'Black takes the second pawn. White attacks on the f-file.',
  'London System':
    'White plays d4, Bf4, e3, Nf3 and c3, a solid setup that works against almost anything.',
  "Queen's Pawn Game: London System":
    'White plays d4, Bf4, e3, Nf3 and c3, a solid setup that works against almost anything.',
  "Queen's Pawn Game: Accelerated London System":
    'White plays Bf4 on move two, before Nf3.',
  "Queen's Pawn Game: Colle System":
    'White plays d4, e3, Bd3 and Nbd2, preparing e4.',
  "Queen's Pawn Game: Chigorin Variation": 'White develops Nc3 before c4.',
  'Indian Defense': 'Black answers d4 with ...Nf6, keeping options open.',
  'English Opening':
    'White controls d5 from the side with c4, often turning into a reversed Sicilian.',
  "English Opening: King's English Variation":
    'Black answers with ...e5, a reversed Sicilian.',
  'English Opening: Symmetrical Variation': 'Black mirrors with ...c5.',
  'English Opening: Anglo-Indian Defense':
    'Black plays ...Nf6, keeping a flexible Indian setup.',
  'English Opening: Agincourt Defense':
    'Black plays ...e6 and ...d5, often transposing to the Queen’s Gambit.',
  'English Opening: Anglo-Scandinavian Defense':
    'Black hits c4 with ...d5 at once.',
  'Réti Opening':
    'White attacks the center from a distance with Nf3, c4 and g3.',
  "King's Indian Attack":
    'White plays Nf3, g3, Bg2, O-O and d3, often followed by e4 and a kingside attack.',
  'Zukertort Opening': 'White opens with Nf3, keeping every option open.',
  'Bird Opening': 'White grabs e5 with f4, a reversed Dutch.',
  "Bird Opening: From's Gambit":
    'Black gives a pawn with ...e5 for quick attacking chances.',
}

export function variationNote(name: string): string | undefined {
  let best: string | undefined
  for (const key of Object.keys(NOTES)) {
    if (
      (name === key ||
        name.startsWith(key + ':') ||
        name.startsWith(key + ',')) &&
      (!best || key.length > best.length)
    )
      best = key
  }
  return best && NOTES[best]
}
