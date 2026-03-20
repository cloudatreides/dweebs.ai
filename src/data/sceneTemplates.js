// Scene templates with category tags.
// {char1}, {char2}, {char3} are replaced with selected character first names at runtime.

export const SCENE_TEMPLATES = [
  // Music & Performance
  { mood: 'creative', text: "{char1} and {char2} are co-headlining a surprise festival set. They have 30 minutes to agree on a setlist." },
  { mood: 'creative', text: "{char1} walks into {char2}'s recording session uninvited. They end up making the most unexpected collab." },
  { mood: 'creative', text: "{char1} and {char2} are stuck in a green room before a sold-out show. Neither expected to share the stage." },
  { mood: 'creative', text: "{char1} just heard {char2}'s new album and has a lot of notes." },
  { mood: 'creative', text: "{char1} is teaching {char2} how to perform. {char2} thinks they already know everything." },
  { mood: 'creative', text: "{char1} and {char2} are co-writing a song but cannot agree on a single lyric." },
  { mood: 'creative', text: "{char1} is the opening act for {char2}'s show. The crowd prefers {char1}." },
  { mood: 'creative', text: "{char1} and {char2} have one hour to rehearse before the biggest performance of their lives." },
  { mood: 'creative', text: "{char1} refuses to perform without {char2} in the crowd. {char2} doesn't know this yet." },
  { mood: 'creative', text: "{char1} and {char2} are doing a joint livestream that is already going off the rails." },

  // Competition & Rivalry
  { mood: 'rivalry', text: "{char1} and {char2} are competing for the same award at a ceremony neither wanted to attend." },
  { mood: 'rivalry', text: "{char1} just beat {char2} at something {char2} considered their specialty." },
  { mood: 'rivalry', text: "{char1} and {char2} have been rivals for years. Tonight they're forced onto the same team." },
  { mood: 'rivalry', text: "{char1} and {char2} are the only two left in a tournament. Neither expected to get this far." },
  { mood: 'rivalry', text: "{char1} and {char2} both show up to the same audition for the same role." },
  { mood: 'rivalry', text: "{char1} just won something {char2} wanted more than anything. They're both in the same room." },
  { mood: 'rivalry', text: "{char1} challenges {char2} to a freestyle battle in an empty parking lot at midnight." },
  { mood: 'rivalry', text: "{char1} and {char2} are facing off in a radio battle. The DJ lets them go for as long as they want." },

  // Unexpected Situations
  { mood: 'chaos', text: "{char1} and {char2} are trapped in an elevator in a 5-star hotel. Neither knows who called for help." },
  { mood: 'chaos', text: "{char1} and {char2} accidentally booked the same Airbnb for the same weekend." },
  { mood: 'chaos', text: "{char1} runs into {char2} at 3am in a 24-hour diner. Both are clearly avoiding something." },
  { mood: 'chaos', text: "{char1} and {char2} are both lost in the same foreign city. Neither speaks the language." },
  { mood: 'chaos', text: "{char1} and {char2} are stuck on a delayed flight. Row 24. Eight hours to go." },
  { mood: 'chaos', text: "{char1} and {char2} are stranded after missing the last train. One seat left at the station café." },
  { mood: 'chaos', text: "{char1} and {char2} get locked in a studio overnight. Everything that needed to be said gets said." },
  { mood: 'chaos', text: "{char1} and {char2} are both waiting for the same person who will not show up." },
  { mood: 'chaos', text: "{char1} shows up at {char2}'s door in the middle of the night with no explanation." },
  { mood: 'chaos', text: "{char1} and {char2} are stuck in traffic on the way to the most important event of their lives." },

  // Debate & Tension
  { mood: 'drama', text: "{char1} thinks tradition wins. {char2} disagrees. This argument has been going on for an hour." },
  { mood: 'drama', text: "{char1} is trying to convince {char2} to take a risk. {char2} needs more than enthusiasm." },
  { mood: 'drama', text: "{char1} is giving {char2} one last chance to explain themselves." },
  { mood: 'drama', text: "{char1} and {char2} both claim credit for the same idea. Neither is lying." },
  { mood: 'drama', text: "{char1} thinks {char2} is faking it. {char2} knows {char1} can see right through them." },
  { mood: 'drama', text: "{char1} just publicly called out {char2} online. Now they're in the same room." },
  { mood: 'drama', text: "{char1} and {char2} are reviewing each other's work. Neither pulls their punches." },
  { mood: 'drama', text: "{char1} gives {char2} one honest piece of advice. {char2} wasn't ready to hear it." },

  // Discovery & Secrets
  { mood: 'drama', text: "{char1} finds {char2}'s journal. They haven't decided whether to say anything." },
  { mood: 'drama', text: "{char1} just found out {char2} is the one who's been leaving anonymous gifts for them." },
  { mood: 'drama', text: "{char1} overhears {char2} saying something that changes how they see them completely." },
  { mood: 'drama', text: "{char1} sent {char2} a message meant for someone else. It contained everything." },
  { mood: 'drama', text: "{char1} and {char2} discover they've been writing letters to each other anonymously for two years." },
  { mood: 'drama', text: "{char1} is the reason {char2} started. {char2} just found out." },
  { mood: 'drama', text: "{char1} finds out {char2} has been secretly watching all their performances." },
  { mood: 'drama', text: "{char1} is writing a song about {char2} and doesn't realize {char2} is standing right behind them." },

  // Emotional & Personal
  { mood: 'emotional', text: "{char1} is in the middle of a crisis and {char2} is the only one who picked up the phone." },
  { mood: 'emotional', text: "{char1} is trying to cheer up {char2}. {char2} is not making it easy." },
  { mood: 'emotional', text: "{char1} just quit the group. {char2} is the only one chasing them down." },
  { mood: 'emotional', text: "{char1} is trying to retire. {char2} won't let them." },
  { mood: 'emotional', text: "{char1} just walked away from everything. {char2} followed. Neither knows what comes next." },
  { mood: 'emotional', text: "{char1} and {char2} are starting over. Different city, different rules. Same unfinished story." },
  { mood: 'emotional', text: "{char1} and {char2} are the only two people still awake in the tour house at 4am." },
  { mood: 'emotional', text: "{char1} saves a seat for {char2} at every show. {char2} finally asks why." },
  { mood: 'emotional', text: "{char1} is defending {char2} in front of everyone who told {char2} to quit." },
  { mood: 'emotional', text: "{char1} is at the peak of their power. {char2} has nothing left to lose. They meet in the middle." },

  // Challenge & Growth
  { mood: 'rivalry', text: "{char1} agrees to train {char2} for one month. By day three they already regret it." },
  { mood: 'rivalry', text: "{char1} is trying to get {char2} to take a day off. {char2} doesn't know what that means." },
  { mood: 'chaos', text: "{char1} and {char2} are teammates in an escape room with 5 minutes left on the clock." },
  { mood: 'chaos', text: "{char1} dares {char2} to do something neither of them has ever done. {char2} says yes." },
  { mood: 'emotional', text: "{char1} is trying to convince {char2} to enter the spotlight. {char2} has been hiding for months." },
  { mood: 'creative', text: "{char1} and {char2} are building something from scratch. Nobody told them it was supposed to be impossible." },
  { mood: 'creative', text: "{char1} and {char2} are the new and the legend, forced to collaborate for one final performance." },
  { mood: 'drama', text: "{char1} just turned down the biggest offer of their career. {char2} wants to understand why." },

  // Reality Show & Public Life
  { mood: 'chaos', text: "{char1} and {char2} are judges on a reality show and cannot agree on the winner." },
  { mood: 'chaos', text: "{char1} is interviewing {char2} for a podcast. Things go off-script immediately." },
  { mood: 'chaos', text: "{char1} and {char2} are co-hosting an awards show and reading from the wrong cards." },
  { mood: 'chaos', text: "{char1} and {char2} are running a booth at a fan convention. Nobody is coming. Six hours to go." },
  { mood: 'chaos', text: "{char1} and {char2} are both undercover at the same event, neither knowing the other would be there." },
  { mood: 'chaos', text: "{char1} and {char2} are testing a new VR world together. The simulation glitches." },
  { mood: 'chaos', text: "{char1} and {char2} are in a documentary crew's way. Neither agreed to be filmed today." },

  // Mentorship & Legacy
  { mood: 'emotional', text: "{char1} and {char2} have been assigned as mentors to the same student who plays them against each other." },
  { mood: 'emotional', text: "{char1} is planning a comeback. {char2} is the only one honest enough to say it's too soon." },
  { mood: 'emotional', text: "{char1} is retiring. {char2} is the only person at the farewell dinner who tells the truth." },
  { mood: 'quiet', text: "{char1} and {char2} swap playlists. The conversation that follows is not what either expected." },
  { mood: 'emotional', text: "{char1} is the fan. {char2} is the idol. They meet backstage and neither acts the way the other expected." },

  // Survival & Stakes
  { mood: 'drama', text: "{char1} and {char2} are the last two standing in a survival scenario with one exit." },
  { mood: 'drama', text: "{char1} and {char2} are both trying to find the same missing person." },
  { mood: 'drama', text: "{char1} just saved {char2}'s life and is waiting for a thank-you that isn't coming." },
  { mood: 'drama', text: "{char1} is guarding a secret and {char2} keeps asking the exact right questions." },
  { mood: 'drama', text: "{char1} and {char2} are both going after the same thing. They meet halfway." },
  { mood: 'drama', text: "{char1} breaks something that belongs to {char2}. It's not replaceable." },
  { mood: 'drama', text: "{char1} just made a major mistake and {char2} is the only witness." },

  // Downtime & Quiet Moments
  { mood: 'quiet', text: "{char1} and {char2} are the last two people at a party neither wanted to be at." },
  { mood: 'quiet', text: "{char1} and {char2} both arrive early to a meeting nobody else shows up to." },
  { mood: 'quiet', text: "{char1} and {char2} are both going through old boxes and find something they weren't supposed to see." },
  { mood: 'quiet', text: "{char1} is in {char2}'s city for one night only. {char2} has a full itinerary. {char1} does not." },
  { mood: 'quiet', text: "{char1} and {char2} have been assigned to share a tour bus for six weeks." },
  { mood: 'quiet', text: "{char1} and {char2} meet at the top of a mountain neither was supposed to be climbing." },
  { mood: 'quiet', text: "{char1} and {char2} are midnight sparring partners who never talk about anything real. Tonight is different." },

  // Three-character scenes
  { mood: 'chaos', text: "{char1}, {char2}, and {char3} are three strangers who all got the same mysterious invitation." },
  { mood: 'drama', text: "{char1} and {char2} have been arguing for days. {char3} is the tiebreaker neither wants." },
  { mood: 'drama', text: "{char1} is trying to keep {char2} and {char3} from finding out about each other." },
  { mood: 'chaos', text: "{char1}, {char2}, and {char3} are stuck together on a night when none of them planned to be." },
  { mood: 'chaos', text: "{char1} came to meet {char2}. Nobody told them {char3} would also be there." },
  { mood: 'rivalry', text: "{char1} needs {char2} and {char3} to agree on something. They have never agreed on anything." },
  { mood: 'rivalry', text: "{char1}, {char2}, and {char3} each think they're the one in charge of this situation." },
  { mood: 'drama', text: "{char1} is the only one who knows what {char2} and {char3} have in common." },

  // Wild Cards
  { mood: 'chaos', text: "{char1} and {char2} are playing the same character in two different versions of the same story." },
  { mood: 'emotional', text: "{char1} needs {char2}'s help with something they'd never admit to needing help with." },
  { mood: 'rivalry', text: "{char1} and {char2} are both trying to get the last ticket to the same sold-out event." },
  { mood: 'creative', text: "{char1} and {char2} have to write a speech together by morning." },
  { mood: 'drama', text: "{char1} is about to quit and {char2} just found out." },
  { mood: 'chaos', text: "{char1} and {char2} have to pretend to be friends at an event. They have not spoken in years." },
  { mood: 'rivalry', text: "{char1} challenges {char2} to a battle. Neither expected the other to actually show up." },
  { mood: 'drama', text: "{char1} is in the middle of a speech when {char2} walks into the room." },
]

export const MOODS = [
  { id: 'all',      label: '✦ All',      color: '#9CA3AF' },
  { id: 'drama',    label: '🎭 Drama',   color: '#F87171' },
  { id: 'rivalry',  label: '⚔️ Rivalry', color: '#FB923C' },
  { id: 'emotional',label: '💜 Emotional',color: '#A78BFA' },
  { id: 'creative', label: '🎵 Creative', color: '#34D399' },
  { id: 'chaos',    label: '⚡ Chaos',   color: '#FBBF24' },
  { id: 'quiet',    label: '🌙 Quiet',   color: '#60A5FA' },
]
