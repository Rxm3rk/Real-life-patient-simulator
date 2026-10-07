import type { Answer, CaseDef, ExamKind, IntentCategory } from '../engine/types'

export interface IntentCtx {
  c: CaseDef
}

export interface Intent {
  id: string
  cat: IntentCategory
  /** Canonical phrasing shown in the question browser */
  q: string
  /** Example phrasings used for free-text / voice matching */
  ex: string[]
  /** Answer when the case does not override it */
  def: Answer | ((x: IntentCtx) => Answer)
  sex?: 'female' | 'male'
  /** Only list in the browser for these stations (always matchable) */
  exams?: ExamKind[]
  /** Hidden from the browser (matched only from free text) */
  hidden?: boolean
}

const NO = ['No.', 'No, not at all.', 'No, nothing like that.', 'Not that I’ve noticed.', 'No, I don’t think so.']
const no = (seed: string) => NO[[...seed].reduce((a, ch) => a + ch.charCodeAt(0), 0) % NO.length]

const young = (x: IntentCtx) => x.c.patient.age < 50
const fem = (x: IntentCtx) => x.c.patient.sex === 'female'

export const INTENTS: Intent[] = [
  /* ------------------------------ Communication ------------------------------ */
  {
    id: 'comm.intro',
    cat: 'Communication',
    q: 'Hello, I’m one of the medical students. Could I introduce myself?',
    ex: ['hello my name is', 'hi i am a medical student', 'good morning i am the doctor', 'let me introduce myself', 'i am one of the junior doctors', 'hi im the foundation doctor', 'hello i am the surgical fy1'],
    def: (x) => ({
      text:
        x.c.patient.persona.mood === 'distressed'
          ? 'Hello… sorry, it really hurts.'
          : x.c.patient.persona.mood === 'anxious'
            ? 'Hello, doctor. Thank you for coming.'
            : 'Hello, nice to meet you.',
    }),
  },
  {
    id: 'comm.identity',
    cat: 'Communication',
    q: 'Can you confirm your full name and date of birth?',
    ex: ['can you confirm your name and date of birth', 'what is your name', 'whats your date of birth', 'could you tell me your full name', 'confirm your details please', 'how old are you'],
    def: (x) => `It’s ${x.c.patient.name}. Date of birth ${x.c.patient.dob} — I’m ${x.c.patient.age}.`,
  },
  {
    id: 'comm.consent',
    cat: 'Communication',
    q: 'Is it okay if I ask you some questions about what’s been happening?',
    ex: ['is it ok if i ask you some questions', 'would you mind if i ask a few questions', 'can i take a history', 'is that alright with you', 'do i have your permission', 'are you happy to talk to me'],
    def: 'Yes, of course.',
  },
  {
    id: 'comm.open',
    cat: 'Presenting complaint',
    q: 'What’s brought you in today?',
    ex: ['what brought you in today', 'what brings you here', 'how can i help', 'tell me what has been going on', 'what seems to be the problem', 'what happened', 'why are you in hospital', 'whats wrong', 'how are you feeling'],
    def: (x) => x.c.history.opening,
  },
  {
    id: 'comm.more',
    cat: 'Presenting complaint',
    q: 'Can you tell me a bit more about that?',
    ex: ['tell me more', 'can you tell me more about that', 'go on', 'anything else about it', 'could you describe it more', 'what else'],
    def: 'I’m not sure what else to say… it’s mostly the pain that’s bothering me.',
  },
  {
    id: 'comm.anything_else',
    cat: 'Presenting complaint',
    q: 'Have you noticed anything else wrong?',
    ex: ['anything else you have noticed', 'any other symptoms', 'is there anything else', 'have you noticed anything else', 'anything else bothering you'],
    def: 'No, I think that’s everything.',
  },
  {
    id: 'comm.empathy',
    cat: 'Communication',
    q: 'I’m sorry to hear that — that sounds really difficult.',
    ex: ['i am sorry to hear that', 'that sounds really difficult', 'that must be awful', 'that sounds painful', 'i understand this must be worrying', 'that must be hard for you'],
    def: 'Thank you… it has been a rough day.',
  },
  {
    id: 'comm.analgesia',
    cat: 'Communication',
    q: 'Would you like something for the pain?',
    ex: ['would you like some pain relief', 'can i get you something for the pain', 'do you need painkillers', 'shall i get you some analgesia', 'would you like morphine', 'let me get you something for the pain'],
    def: 'Yes please, that would really help.',
  },
  {
    id: 'comm.summary',
    cat: 'Closing',
    q: 'Let me summarise what you’ve told me…',
    ex: ['let me summarise', 'just to summarise', 'so to recap', 'can i check i have understood', 'so what you are telling me is'],
    def: 'Yes, that’s right.',
  },
  {
    id: 'comm.questions',
    cat: 'Closing',
    q: 'Do you have any questions for me?',
    ex: ['do you have any questions', 'is there anything you would like to ask', 'any questions for me', 'anything you want to ask me'],
    def: 'Just — do you know what it is yet, doctor?',
  },
  {
    id: 'comm.thanks',
    cat: 'Closing',
    q: 'Thank you for speaking with me.',
    ex: ['thank you', 'thanks for your time', 'thank you for talking to me', 'thanks very much', 'that is all the questions i have'],
    def: 'Thank you, doctor.',
  },

  /* ----------------------------- Pain (SOCRATES) ----------------------------- */
  {
    id: 'pain.site',
    cat: 'Pain (SOCRATES)',
    q: 'Where exactly is the pain? Can you point to it?',
    ex: ['where is the pain', 'where does it hurt', 'can you show me where the pain is', 'point to where it hurts', 'which part of your tummy', 'where exactly is it sore', 'location of the pain', 'where do you feel it'],
    def: 'It’s here.',
  },
  {
    id: 'pain.onset',
    cat: 'Pain (SOCRATES)',
    q: 'When did the pain start, and did it come on suddenly or gradually?',
    ex: ['when did the pain start', 'how long have you had the pain', 'did it come on suddenly', 'did it start gradually', 'when did this begin', 'how did the pain start', 'how long has this been going on', 'what were you doing when it started'],
    def: 'It came on gradually over the last day or so.',
  },
  {
    id: 'pain.character',
    cat: 'Pain (SOCRATES)',
    q: 'What does the pain feel like — sharp, dull, crampy, burning?',
    ex: ['what does the pain feel like', 'can you describe the pain', 'is it sharp or dull', 'is it a crampy pain', 'what kind of pain is it', 'is it burning', 'is it stabbing', 'what type of pain'],
    def: 'It’s a dull ache.',
  },
  {
    id: 'pain.radiation',
    cat: 'Pain (SOCRATES)',
    q: 'Does the pain spread or go anywhere else?',
    ex: ['does the pain go anywhere', 'does it spread anywhere', 'does it radiate', 'do you feel it anywhere else', 'does it go through to your back', 'does it move to your shoulder', 'does it travel'],
    def: 'No, it stays in the same place.',
  },
  {
    id: 'pain.moved',
    cat: 'Pain (SOCRATES)',
    q: 'Has the pain moved since it first started?',
    ex: ['has the pain moved', 'has it changed position', 'did it start somewhere else', 'where did it start originally', 'has the pain shifted', 'was it always in the same place'],
    def: 'No, it’s been in the same place the whole time.',
  },
  {
    id: 'pain.timing',
    cat: 'Pain (SOCRATES)',
    q: 'Is the pain constant, or does it come and go?',
    ex: ['is the pain constant', 'does it come and go', 'is it there all the time', 'does it come in waves', 'is it continuous or intermittent', 'how long does each episode last'],
    def: 'It’s there most of the time.',
  },
  {
    id: 'pain.exacerbating',
    cat: 'Pain (SOCRATES)',
    q: 'Does anything make the pain worse?',
    ex: ['does anything make it worse', 'what makes the pain worse', 'is it worse when you move', 'is it worse with coughing', 'is it worse after eating', 'does movement aggravate it', 'did the bumps in the car make it worse'],
    def: 'Not really, nothing in particular.',
  },
  {
    id: 'pain.relieving',
    cat: 'Pain (SOCRATES)',
    q: 'Does anything make the pain better?',
    ex: ['does anything make it better', 'what helps the pain', 'does anything help', 'anything that helps', 'does anything relieve it', 'does lying still help', 'does leaning forward help', 'what eases the pain', 'does anything ease it'],
    def: 'Not really. Lying still helps a little.',
  },
  {
    id: 'pain.severity',
    cat: 'Pain (SOCRATES)',
    q: 'On a scale of 0 to 10, how bad is the pain?',
    ex: ['how bad is the pain out of 10', 'on a scale of 1 to 10', 'how severe is the pain', 'score the pain out of ten', 'how painful is it', 'rate your pain', 'worst pain ever'],
    def: (x) => `About ${x.c.vitals.pain ?? 5} out of 10.`,
  },
  {
    id: 'pain.previous',
    cat: 'Pain (SOCRATES)',
    q: 'Have you ever had pain like this before?',
    ex: ['have you had this before', 'have you ever had pain like this', 'any similar episodes', 'is this the first time', 'has this happened before'],
    def: 'No, never anything like this.',
  },
  {
    id: 'pain.analgesia_taken',
    cat: 'Pain (SOCRATES)',
    q: 'Have you taken anything for the pain?',
    ex: ['have you taken anything for the pain', 'did you take any painkillers', 'have you tried paracetamol', 'did anything you took help'],
    def: 'I took some paracetamol at home but it didn’t do much.',
  },

  /* ------------------------------ Gastrointestinal ------------------------------ */
  { id: 'gi.nausea', cat: 'Gastrointestinal', q: 'Have you felt sick (nauseous)?', ex: ['do you feel sick', 'any nausea', 'have you felt nauseous', 'do you feel queasy', 'feeling sick in your stomach'], def: (x) => no('gi.nausea' + x.c.id) },
  {
    id: 'gi.vomiting',
    cat: 'Gastrointestinal',
    q: 'Have you been vomiting? How many times?',
    ex: ['have you been vomiting', 'have you been sick', 'have you thrown up', 'any vomiting', 'how many times have you vomited', 'have you brought anything up'],
    def: 'No, I haven’t been sick.',
  },
  {
    id: 'gi.vomit_content',
    cat: 'Gastrointestinal',
    q: 'What did the vomit look like — any blood, bile or coffee grounds?',
    ex: ['what did the vomit look like', 'was there blood in the vomit', 'was it green', 'did it look like coffee grounds', 'what colour was the vomit', 'was it bilious', 'did it smell like faeces'],
    def: 'I haven’t actually vomited.',
  },
  { id: 'gi.appetite', cat: 'Gastrointestinal', q: 'How has your appetite been?', ex: ['how is your appetite', 'have you been eating', 'have you lost your appetite', 'do you feel like eating', 'off your food'], def: 'It’s been fine.' },
  {
    id: 'gi.weight',
    cat: 'Gastrointestinal',
    q: 'Have you lost any weight without trying?',
    ex: ['have you lost any weight', 'any weight loss', 'have your clothes been looser', 'unintentional weight loss', 'has your weight changed'],
    def: 'No, my weight’s been steady.',
  },
  { id: 'gi.dysphagia', cat: 'Gastrointestinal', q: 'Any difficulty swallowing?', ex: ['any difficulty swallowing', 'does food get stuck', 'trouble swallowing', 'any problems swallowing'], def: (x) => no('gi.dysphagia' + x.c.id) },
  {
    id: 'gi.dysphagia_type',
    cat: 'Gastrointestinal',
    q: 'Is it solids, liquids or both — and is it getting worse?',
    ex: ['is it solids or liquids', 'solids or liquids', 'can you swallow liquids', 'is the swallowing getting worse', 'is it progressive', 'what foods get stuck', 'both solids and liquids'],
    def: 'I don’t have any trouble swallowing.',
  },
  { id: 'gi.dysphagia_level', cat: 'Gastrointestinal', q: 'Where does the food seem to stick?', ex: ['where does it stick', 'where does the food stick', 'point to where it sticks', 'does it stick in your throat or chest'], def: 'Nothing sticks.' },
  { id: 'gi.regurgitation', cat: 'Gastrointestinal', q: 'Do you bring food back up undigested?', ex: ['does food come back up', 'do you regurgitate', 'bring up undigested food', 'regurgitation', 'food on the pillow at night'], def: (x) => no('gi.regurgitation' + x.c.id) },
  { id: 'gi.odynophagia', cat: 'Gastrointestinal', q: 'Is it painful to swallow?', ex: ['is it painful to swallow', 'does swallowing hurt', 'pain when you swallow', 'odynophagia'], def: (x) => no('gi.odynophagia' + x.c.id) },
  { id: 'gi.reflux', cat: 'Gastrointestinal', q: 'Do you get indigestion or heartburn?', ex: ['any indigestion', 'do you get heartburn', 'acid reflux', 'burning in your chest after food', 'dyspepsia'], def: 'Only very occasionally, after a big meal.' },
  {
    id: 'gi.bowels_last',
    cat: 'Gastrointestinal',
    q: 'When did you last open your bowels?',
    ex: ['when did you last open your bowels', 'when did you last have a poo', 'when was your last bowel movement', 'when did you last go to the toilet for a number two', 'last stool'],
    def: 'This morning — it was normal.',
  },
  { id: 'gi.flatus', cat: 'Gastrointestinal', q: 'Are you still passing wind?', ex: ['are you passing wind', 'have you passed any gas', 'can you fart', 'any flatus', 'passing gas from your back passage'], def: 'Yes.' },
  {
    id: 'gi.bowel_change',
    cat: 'Gastrointestinal',
    q: 'Has there been any change in your bowel habit?',
    ex: ['any change in your bowel habit', 'have your bowels changed', 'are your bowels normal', 'how often do you open your bowels', 'any change in your stools'],
    def: 'No, they’re normal for me.',
  },
  { id: 'gi.diarrhoea', cat: 'Gastrointestinal', q: 'Any diarrhoea?', ex: ['any diarrhoea', 'loose stools', 'watery stools', 'runny poo'], def: (x) => no('gi.diarrhoea' + x.c.id) },
  { id: 'gi.constipation', cat: 'Gastrointestinal', q: 'Any constipation?', ex: ['any constipation', 'are you constipated', 'struggling to open your bowels', 'hard stools'], def: (x) => no('gi.constipation' + x.c.id) },
  {
    id: 'gi.stool_blood',
    cat: 'Gastrointestinal',
    q: 'Have you noticed any blood in your stools?',
    ex: ['any blood in your stool', 'any rectal bleeding', 'blood when you open your bowels', 'blood in the toilet', 'bleeding from your back passage', 'blood on the toilet paper'],
    def: 'No.',
  },
  { id: 'gi.melaena', cat: 'Gastrointestinal', q: 'Any black, tarry stools?', ex: ['any black stools', 'tarry stools', 'dark sticky stool', 'melaena'], def: (x) => no('gi.melaena' + x.c.id) },
  { id: 'gi.stool_colour', cat: 'Gastrointestinal', q: 'Have your stools been pale or hard to flush?', ex: ['have your stools been pale', 'pale stools', 'do your stools float', 'stools hard to flush', 'clay coloured stools'], def: 'No, they look normal.' },
  { id: 'gi.mucus', cat: 'Gastrointestinal', q: 'Any mucus in your stools?', ex: ['any mucus in your stools', 'slime in your stool', 'mucus'], def: (x) => no('gi.mucus' + x.c.id) },
  { id: 'gi.tenesmus', cat: 'Gastrointestinal', q: 'Do you feel you haven’t fully emptied your bowels afterwards?', ex: ['do you feel you havent emptied your bowels', 'incomplete emptying', 'tenesmus', 'feeling of needing to go again'], def: (x) => no('gi.tenesmus' + x.c.id) },
  { id: 'gi.distension', cat: 'Gastrointestinal', q: 'Has your tummy been swollen or bloated?', ex: ['has your tummy been swollen', 'any bloating', 'is your abdomen distended', 'has your belly got bigger', 'swollen stomach'], def: 'No.' },
  { id: 'gi.jaundice', cat: 'Gastrointestinal', q: 'Have you noticed any yellowing of your skin or eyes?', ex: ['any yellowing of your skin', 'have your eyes gone yellow', 'have you been jaundiced', 'yellow skin', 'jaundice'], def: 'No.' },
  { id: 'gi.itch', cat: 'Gastrointestinal', q: 'Have you been itchy?', ex: ['have you been itchy', 'any itching', 'itchy skin', 'pruritus'], def: (x) => no('gi.itch' + x.c.id) },
  { id: 'gi.dark_urine', cat: 'Gastrointestinal', q: 'Has your urine been dark?', ex: ['has your urine been dark', 'dark urine', 'tea coloured urine', 'is your wee dark'], def: 'No, it’s normal.' },

  /* ---------------------------------- Urinary ---------------------------------- */
  { id: 'gu.dysuria', cat: 'Urinary', q: 'Any pain or burning when passing urine?', ex: ['any pain when passing urine', 'does it burn when you wee', 'stinging when you pee', 'dysuria', 'pain on urination'], def: (x) => no('gu.dysuria' + x.c.id) },
  { id: 'gu.frequency', cat: 'Urinary', q: 'Are you passing urine more often than usual?', ex: ['passing urine more often', 'going to the toilet more', 'urinary frequency', 'weeing more often', 'getting up at night to pass urine'], def: (x) => no('gu.frequency' + x.c.id) },
  { id: 'gu.haematuria', cat: 'Urinary', q: 'Any blood in your urine?', ex: ['any blood in your urine', 'red urine', 'blood when you wee', 'haematuria'], def: (x) => no('gu.haematuria' + x.c.id) },
  { id: 'gu.stream', cat: 'Urinary', q: 'Any difficulty starting, or a weak stream?', ex: ['any difficulty passing urine', 'weak stream', 'hesitancy', 'trouble starting to wee', 'dribbling', 'cant pass urine'], def: (x) => no('gu.stream' + x.c.id) },
  { id: 'gu.loin', cat: 'Urinary', q: 'Any pain in your back or sides (loins)?', ex: ['any pain in your back', 'pain in your side', 'loin pain', 'pain in your flank', 'kidney pain'], def: 'No.' },
  { id: 'gu.output', cat: 'Urinary', q: 'Are you passing as much urine as normal?', ex: ['are you passing much urine', 'how much urine are you passing', 'when did you last pass urine', 'have you been weeing normally'], def: 'Yes, I think so.' },

  /* ------------------------------- Gynaecological ------------------------------- */
  {
    id: 'gyn.lmp',
    cat: 'Gynaecological',
    sex: 'female',
    q: 'When was the first day of your last period?',
    ex: ['when was your last period', 'first day of your last menstrual period', 'last menstrual period', 'when did you last have a period', 'are your periods late', 'lmp'],
    def: (x) => (x.c.patient.age > 54 ? 'I went through the change years ago — about fifty.' : 'About two weeks ago.'),
  },
  {
    id: 'gyn.pregnant',
    cat: 'Gynaecological',
    sex: 'female',
    q: 'Is there any chance you could be pregnant?',
    ex: ['is there any chance you could be pregnant', 'could you be pregnant', 'are you pregnant', 'possibility of pregnancy', 'have you done a pregnancy test'],
    def: (x) => (x.c.patient.age > 54 ? 'No, not at my age!' : 'I don’t think so… we do use protection.'),
  },
  { id: 'gyn.cycle', cat: 'Gynaecological', sex: 'female', q: 'Are your periods regular?', ex: ['are your periods regular', 'is your cycle regular', 'heavy periods', 'painful periods'], def: (x) => (x.c.patient.age > 54 ? 'I don’t have periods any more.' : 'Yes, every month or so.') },
  { id: 'gyn.discharge', cat: 'Gynaecological', sex: 'female', q: 'Any unusual vaginal discharge?', ex: ['any vaginal discharge', 'unusual discharge down below', 'discharge'], def: 'No.' },
  { id: 'gyn.bleeding', cat: 'Gynaecological', sex: 'female', q: 'Any bleeding between periods or after sex?', ex: ['bleeding between periods', 'bleeding after sex', 'vaginal bleeding', 'post menopausal bleeding', 'any spotting'], def: 'No.' },
  { id: 'gyn.contraception', cat: 'Gynaecological', sex: 'female', q: 'Do you use any contraception?', ex: ['do you use contraception', 'are you on the pill', 'do you have a coil', 'what contraception do you use'], def: (x) => (x.c.patient.age > 54 ? 'No need any more.' : 'We use condoms.') },
  { id: 'sx.sexual', cat: 'Gynaecological', q: 'Could I ask about your sexual health — are you sexually active?', ex: ['are you sexually active', 'do you have a regular partner', 'any new sexual partners', 'sexual history', 'unprotected sex'], def: (x) => (x.c.patient.age > 70 ? 'Not these days, no.' : 'Yes, with my long-term partner.') },

  /* ----------------------------------- Systemic ----------------------------------- */
  { id: 'sys.fever', cat: 'Systemic', q: 'Have you had a fever or felt hot and sweaty?', ex: ['have you had a fever', 'have you felt hot', 'any temperature', 'feverish', 'high temperature', 'hot and cold'], def: (x) => no('sys.fever' + x.c.id) },
  { id: 'sys.rigors', cat: 'Systemic', q: 'Have you had any shaking or shivering episodes?', ex: ['any shaking episodes', 'have you had rigors', 'uncontrollable shivering', 'shivers', 'chills'], def: 'No.' },
  { id: 'sys.sweats', cat: 'Systemic', q: 'Any night sweats?', ex: ['any night sweats', 'drenching sweats at night', 'waking up sweaty'], def: 'No.' },
  { id: 'sys.fatigue', cat: 'Systemic', q: 'Have you been feeling more tired than usual?', ex: ['have you been tired', 'any fatigue', 'feeling tired all the time', 'lethargy', 'no energy'], def: 'Not really.' },
  { id: 'sys.lumps', cat: 'Systemic', q: 'Have you noticed any lumps anywhere on your body?', ex: ['any lumps anywhere', 'any lumps in your neck or armpits', 'swollen glands', 'lumps elsewhere'], def: 'No, none.' },

  /* -------------------------------- Systems review -------------------------------- */
  { id: 'ros.chest_pain', cat: 'Systems review', q: 'Any chest pain?', ex: ['any chest pain', 'pain in your chest', 'chest tightness'], def: (x) => no('ros.chest_pain' + x.c.id) },
  { id: 'ros.sob', cat: 'Systems review', q: 'Any shortness of breath?', ex: ['are you short of breath', 'any breathlessness', 'difficulty breathing', 'shortness of breath'], def: 'No.' },
  { id: 'ros.cough', cat: 'Systems review', q: 'Any cough?', ex: ['any cough', 'have you been coughing', 'coughing anything up'], def: 'No.' },
  { id: 'ros.palpitations', cat: 'Systems review', q: 'Any palpitations or a racing heart?', ex: ['any palpitations', 'heart racing', 'irregular heartbeat', 'heart fluttering'], def: 'No.' },
  { id: 'ros.ankles', cat: 'Systems review', q: 'Any swelling of your ankles?', ex: ['any ankle swelling', 'swollen legs', 'swollen feet'], def: 'No.' },
  { id: 'ros.headache', cat: 'Systems review', q: 'Any headaches?', ex: ['any headaches', 'headache'], def: 'No.' },
  { id: 'ros.dizzy', cat: 'Systems review', q: 'Any dizziness or blackouts?', ex: ['any dizziness', 'have you fainted', 'light headed', 'blackouts', 'collapse'], def: 'No.' },
  { id: 'ros.snoring', cat: 'Systems review', q: 'Do you snore, stop breathing at night or feel sleepy in the day?', ex: ['do you snore', 'sleep apnoea', 'stop breathing at night', 'sleepy during the day', 'do you use cpap'], def: 'No.' },
  { id: 'ros.joints', cat: 'Systems review', q: 'Any joint pains or rashes?', ex: ['any joint pains', 'any rashes', 'skin rash', 'painful joints'], def: 'No.' },

  /* ------------------------------------- Lump ------------------------------------- */
  { id: 'lump.when', cat: 'Lump', q: 'When did you first notice the lump?', ex: ['when did you notice the lump', 'how long has the lump been there', 'when did the swelling appear', 'when did you first see it'], def: 'A few months ago.', exams: ['lump', 'groin', 'thyroid', 'breast', 'scrotal'] },
  { id: 'lump.how', cat: 'Lump', q: 'How did you notice it?', ex: ['how did you notice it', 'how did you find the lump', 'did someone else notice it'], def: 'I just felt it one day in the shower.', exams: ['lump', 'groin', 'thyroid', 'breast', 'scrotal'] },
  { id: 'lump.change', cat: 'Lump', q: 'Has it changed in size since you first noticed it?', ex: ['has it changed in size', 'has the lump got bigger', 'is it growing', 'has it grown', 'has it shrunk'], def: 'It might be a bit bigger.', exams: ['lump', 'groin', 'thyroid', 'breast', 'scrotal'] },
  { id: 'lump.pain', cat: 'Lump', q: 'Is the lump painful or tender?', ex: ['is the lump painful', 'does the lump hurt', 'is it tender', 'is the swelling sore'], def: 'No, it doesn’t hurt.', exams: ['lump', 'groin', 'thyroid', 'breast', 'scrotal'] },
  { id: 'lump.other', cat: 'Lump', q: 'Have you noticed any other lumps?', ex: ['any other lumps', 'lumps anywhere else', 'is this the only lump'], def: 'No, just this one.', exams: ['lump', 'groin', 'thyroid', 'breast', 'scrotal'] },
  { id: 'lump.discharge', cat: 'Lump', q: 'Has it ever discharged anything?', ex: ['has it discharged', 'any pus from it', 'does anything come out of it', 'any discharge from the lump'], def: 'No.', exams: ['lump'] },
  { id: 'lump.skin', cat: 'Lump', q: 'Any change in the skin over it?', ex: ['any change in the skin over it', 'is the skin red', 'skin changes over the lump'], def: 'No.', exams: ['lump', 'breast'] },
  { id: 'lump.reduce', cat: 'Scrotal & groin', q: 'Does the lump disappear when you lie down, or can you push it back?', ex: ['does it go away when you lie down', 'can you push it back in', 'does it disappear', 'is it reducible', 'does it go back in'], def: 'I’m not sure.', exams: ['groin', 'scrotal', 'lump'] },
  { id: 'lump.cough', cat: 'Scrotal & groin', q: 'Does it get bigger when you cough or strain?', ex: ['does it get bigger when you cough', 'is it worse when you strain', 'does it come out when you lift', 'bigger when you stand'], def: 'I haven’t noticed.', exams: ['groin', 'scrotal'] },
  { id: 'lump.obstruct', cat: 'Scrotal & groin', q: 'Have you had any vomiting, bloating or problems opening your bowels with it?', ex: ['has it ever got stuck', 'any vomiting with the lump', 'any bowel obstruction symptoms', 'has it ever become painful and stuck'], def: 'No, nothing like that.', exams: ['groin'] },
  { id: 'lump.lifting', cat: 'Scrotal & groin', q: 'Does your job or hobbies involve heavy lifting?', ex: ['do you do heavy lifting', 'does your job involve lifting', 'do you lift weights', 'straining at work'], def: 'Not really.', exams: ['groin'] },

  /* ------------------------------------- Breast ------------------------------------- */
  { id: 'br.nipple_discharge', cat: 'Breast', q: 'Any discharge from the nipple?', ex: ['any nipple discharge', 'anything coming out of the nipple', 'bloody discharge from the nipple'], def: 'No.', exams: ['breast'] },
  { id: 'br.nipple_change', cat: 'Breast', q: 'Any change in the nipple, such as it pulling in?', ex: ['any change in the nipple', 'is the nipple pulled in', 'nipple inversion', 'nipple retraction'], def: 'No.', exams: ['breast'] },
  { id: 'br.skin', cat: 'Breast', q: 'Any dimpling, puckering or redness of the breast skin?', ex: ['any dimpling of the skin', 'orange peel skin', 'redness of the breast', 'puckering of the skin'], def: 'No.', exams: ['breast'] },
  { id: 'br.cyclical', cat: 'Breast', q: 'Does the lump change with your menstrual cycle?', ex: ['does it change with your periods', 'is it worse before your period', 'does it vary with your cycle'], def: 'I haven’t noticed any change.', exams: ['breast'] },
  { id: 'br.menarche', cat: 'Breast', q: 'How old were you when your periods started?', ex: ['when did your periods start', 'how old were you at your first period', 'menarche'], def: 'About twelve.', exams: ['breast'] },
  { id: 'br.menopause', cat: 'Breast', q: 'Have you gone through the menopause?', ex: ['have you been through the menopause', 'when was your menopause', 'are you post menopausal'], def: (x) => (x.c.patient.age > 52 ? 'Yes, at about fifty-one.' : 'No, not yet.'), exams: ['breast'] },
  { id: 'br.hormones', cat: 'Breast', q: 'Have you ever taken HRT or the oral contraceptive pill?', ex: ['have you taken hrt', 'hormone replacement therapy', 'have you been on the pill', 'any hormone treatment'], def: 'I was on the pill in my twenties.', exams: ['breast'] },
  { id: 'br.children', cat: 'Breast', q: 'Do you have children? Did you breastfeed?', ex: ['do you have children', 'have you been pregnant', 'did you breastfeed', 'how old were you at your first child'], def: 'Two children — I breastfed both.', exams: ['breast'] },
  { id: 'br.fh', cat: 'Breast', q: 'Any family history of breast or ovarian cancer?', ex: ['any family history of breast cancer', 'ovarian cancer in the family', 'has your mum or sister had breast cancer'], def: 'No, not that I know of.', exams: ['breast'] },
  { id: 'br.screening', cat: 'Breast', q: 'Have you had a mammogram before?', ex: ['have you had a mammogram', 'breast screening', 'had your breasts checked before'], def: (x) => (x.c.patient.age >= 50 ? 'Yes, about two years ago — it was normal.' : 'No, I’m not old enough yet.'), exams: ['breast'] },

  /* ---------------------------------- Thyroid & neck ---------------------------------- */
  { id: 'thy.heat', cat: 'Thyroid & neck', q: 'Do you prefer hot or cold weather?', ex: ['do you prefer hot or cold weather', 'heat intolerance', 'cold intolerance', 'do you feel the cold more', 'are you always hot'], def: 'I don’t mind either.', exams: ['thyroid'] },
  { id: 'thy.tremor', cat: 'Thyroid & neck', q: 'Any shaking of your hands?', ex: ['any shaking of your hands', 'tremor', 'shaky hands'], def: 'No.', exams: ['thyroid'] },
  { id: 'thy.mood', cat: 'Thyroid & neck', q: 'Have you felt anxious, irritable or low in mood?', ex: ['have you felt anxious', 'feeling irritable', 'low mood', 'feeling depressed', 'mood changes'], def: 'Not really.', exams: ['thyroid'] },
  { id: 'thy.eyes', cat: 'Thyroid & neck', q: 'Any problems with your eyes — grittiness, bulging, double vision?', ex: ['any problems with your eyes', 'gritty eyes', 'bulging eyes', 'double vision'], def: 'No.', exams: ['thyroid'] },
  { id: 'thy.voice', cat: 'Thyroid & neck', q: 'Any change in your voice?', ex: ['any change in your voice', 'hoarse voice', 'hoarseness'], def: 'No.', exams: ['thyroid'] },
  { id: 'thy.breathing', cat: 'Thyroid & neck', q: 'Any difficulty breathing or noisy breathing, especially lying flat?', ex: ['any noisy breathing', 'stridor', 'breathing difficulty lying flat', 'choking feeling'], def: 'No.', exams: ['thyroid'] },
  { id: 'thy.radiation', cat: 'Thyroid & neck', q: 'Have you ever had radiation treatment to your head or neck?', ex: ['any radiation to your neck', 'radiotherapy as a child', 'neck irradiation'], def: 'No.', exams: ['thyroid'] },
  { id: 'thy.fh', cat: 'Thyroid & neck', q: 'Does anyone in the family have thyroid problems?', ex: ['thyroid problems in the family', 'family history of thyroid', 'anyone with thyroid cancer'], def: 'Not that I know of.', exams: ['thyroid'] },

  /* ------------------------------------ Vascular ------------------------------------ */
  { id: 'vas.claudication', cat: 'Vascular', q: 'Do you get pain in your legs when you walk?', ex: ['do you get pain in your legs when walking', 'calf pain on walking', 'claudication', 'leg cramps when you walk'], def: 'No.', exams: ['arterial', 'venous'] },
  { id: 'vas.distance', cat: 'Vascular', q: 'How far can you walk before the pain starts?', ex: ['how far can you walk', 'claudication distance', 'how many yards before you stop'], def: 'I can walk as far as I like.', exams: ['arterial'] },
  { id: 'vas.rest_pain', cat: 'Vascular', q: 'Do you get pain in your feet at rest, especially at night?', ex: ['pain at rest', 'pain in your feet at night', 'do you hang your leg out of bed', 'rest pain', 'sleep in a chair'], def: 'No.', exams: ['arterial'] },
  { id: 'vas.ulcers', cat: 'Vascular', q: 'Any sores, ulcers or wounds on your legs or feet that won’t heal?', ex: ['any ulcers', 'sores on your feet', 'wounds that wont heal', 'black toes'], def: 'No.', exams: ['arterial', 'venous'] },
  { id: 'vas.cold', cat: 'Vascular', q: 'Are your feet cold, numb or discoloured?', ex: ['are your feet cold', 'numbness in your feet', 'colour change in your feet', 'pins and needles in your legs'], def: 'No.', exams: ['arterial'] },
  { id: 'vas.ed', cat: 'Vascular', sex: 'male', q: 'Any difficulty getting or maintaining erections?', ex: ['any erectile dysfunction', 'problems with erections', 'impotence'], def: 'No.', exams: ['arterial'] },
  { id: 'vas.veins', cat: 'Vascular', q: 'Have you noticed bulging veins on your legs?', ex: ['any varicose veins', 'bulging veins', 'lumpy veins on your legs'], def: 'No.', exams: ['venous', 'arterial'] },
  { id: 'vas.aching', cat: 'Vascular', q: 'Do your legs ache, itch or feel heavy — especially at the end of the day?', ex: ['do your legs ache', 'heavy legs', 'itchy legs', 'worse at the end of the day', 'legs throb'], def: 'No.', exams: ['venous'] },
  { id: 'vas.dvt', cat: 'Vascular', q: 'Have you ever had a clot in your leg (DVT)?', ex: ['have you had a dvt', 'clot in your leg', 'blood clot', 'deep vein thrombosis', 'pulmonary embolism'], def: 'No.', exams: ['venous', 'arterial'] },

  /* ---------------------------------- Scrotal ---------------------------------- */
  { id: 'scr.swelling', cat: 'Scrotal & groin', q: 'Have you noticed any swelling of the testicle or scrotum?', ex: ['any swelling of the testicle', 'is the scrotum swollen', 'testicular lump', 'swollen testicle'], def: 'No.', exams: ['scrotal'] },
  { id: 'scr.trauma', cat: 'Scrotal & groin', q: 'Any injury to the area?', ex: ['any injury', 'did you hurt it', 'any trauma', 'were you kicked', 'sports injury'], def: 'No.', exams: ['scrotal'] },
  { id: 'scr.discharge', cat: 'Scrotal & groin', sex: 'male', q: 'Any discharge from the penis?', ex: ['any discharge from the penis', 'urethral discharge', 'discharge from your penis'], def: 'No.', exams: ['scrotal'] },
  { id: 'scr.heaviness', cat: 'Scrotal & groin', q: 'Any dragging or heavy sensation?', ex: ['any dragging sensation', 'feels heavy', 'dragging feeling'], def: 'No.', exams: ['scrotal'] },

  /* ---------------------------------- Anorectal ---------------------------------- */
  { id: 'ano.pain', cat: 'Anorectal', q: 'Is it painful when you open your bowels?', ex: ['is it painful to open your bowels', 'pain when you poo', 'pain on defecation', 'like passing glass'], def: 'No.', exams: ['perianal', 'abdominal'] },
  { id: 'ano.blood_type', cat: 'Anorectal', q: 'Is the blood on the paper, in the pan, or mixed in with the stool?', ex: ['is the blood on the paper', 'is the blood mixed in', 'bright red or dark blood', 'blood in the pan'], def: 'I haven’t seen any blood.' },
  { id: 'ano.lump', cat: 'Anorectal', q: 'Any lumps around your bottom?', ex: ['any lumps around your bottom', 'lump at the back passage', 'piles', 'haemorrhoids'], def: 'No.', exams: ['perianal', 'abdominal'] },
  { id: 'ano.discharge', cat: 'Anorectal', q: 'Any discharge or pus from around the back passage?', ex: ['any discharge from your bottom', 'pus from the back passage', 'discharge around the anus', 'does it weep or leak', 'wet bottom'], def: 'No.', exams: ['perianal'] },
  { id: 'ano.itch', cat: 'Anorectal', q: 'Is it itchy around your bottom?', ex: ['itchy bottom', 'is it itchy around the anus', 'pruritus ani', 'itching back passage'], def: 'No.', exams: ['perianal'] },
  { id: 'ano.prolapse', cat: 'Anorectal', q: 'Does anything come down when you open your bowels?', ex: ['does anything come down', 'does anything prolapse', 'do you have to push anything back', 'something comes out when you strain'], def: 'No.', exams: ['perianal'] },
  { id: 'ano.continence', cat: 'Anorectal', q: 'Any problem controlling your bowels or wind?', ex: ['any incontinence', 'can you control your bowels', 'any accidents', 'leakage of stool', 'can you hold in wind'], def: 'No, that’s fine.', exams: ['perianal'] },

  /* ------------------------------ Past medical history ------------------------------ */
  {
    id: 'pmh.conditions',
    cat: 'Past medical history',
    q: 'Do you have any medical conditions?',
    ex: ['do you have any medical conditions', 'any past medical history', 'are you normally fit and well', 'any health problems', 'do you see your gp for anything', 'any illnesses'],
    def: (x) => x.c.history.pmh ?? 'No, I’m normally fit and well.',
  },
  {
    id: 'pmh.surgery',
    cat: 'Past medical history',
    q: 'Have you had any operations before?',
    ex: ['have you had any operations', 'any previous surgery', 'ever been operated on', 'any surgery on your tummy', 'have you had your appendix out', 'previous operations'],
    def: (x) => x.c.history.psh ?? 'No, never.',
  },
  { id: 'pmh.anaesthetic', cat: 'Past medical history', q: 'Any problems with anaesthetics in you or your family?', ex: ['any problems with anaesthetic', 'reaction to general anaesthetic', 'family problems with anaesthesia'], def: 'Not that I know of.' },
  { id: 'pmh.diabetes', cat: 'Past medical history', q: 'Do you have diabetes?', ex: ['do you have diabetes', 'are you diabetic', 'sugar problems'], def: 'No.' },
  { id: 'pmh.bp', cat: 'Past medical history', q: 'Do you have high blood pressure or high cholesterol?', ex: ['do you have high blood pressure', 'hypertension', 'high cholesterol'], def: 'No.' },
  { id: 'pmh.heart', cat: 'Past medical history', q: 'Any heart problems — angina, heart attack, irregular heartbeat?', ex: ['any heart problems', 'have you had a heart attack', 'angina', 'atrial fibrillation', 'irregular heart rhythm'], def: 'No.' },
  { id: 'pmh.lungs', cat: 'Past medical history', q: 'Any lung problems such as asthma or COPD?', ex: ['any lung problems', 'asthma', 'copd', 'chest problems'], def: 'No.' },
  { id: 'pmh.stroke', cat: 'Past medical history', q: 'Have you had a stroke or mini-stroke?', ex: ['have you had a stroke', 'tia', 'mini stroke'], def: 'No.' },
  { id: 'pmh.gi', cat: 'Past medical history', q: 'Any history of stomach ulcers, gallstones, liver or bowel problems?', ex: ['any stomach ulcers', 'gallstones', 'liver problems', 'bowel problems', 'crohns or colitis', 'inflammatory bowel disease'], def: 'No.' },
  { id: 'pmh.cancer', cat: 'Past medical history', q: 'Have you ever had cancer?', ex: ['have you ever had cancer', 'any history of cancer', 'tumour'], def: 'No.' },
  { id: 'pmh.clots', cat: 'Past medical history', q: 'Any bleeding or clotting problems?', ex: ['any bleeding problems', 'clotting disorder', 'do you bruise easily'], def: 'No.' },

  /* ---------------------------------- Drug history ---------------------------------- */
  {
    id: 'dh.meds',
    cat: 'Drug history',
    q: 'Do you take any regular medications?',
    ex: ['do you take any medications', 'are you on any tablets', 'what medicines do you take', 'any regular medication', 'drug history', 'prescriptions'],
    def: (x) => x.c.history.meds ?? 'No, nothing regular.',
  },
  { id: 'dh.otc', cat: 'Drug history', q: 'Any over-the-counter or herbal remedies?', ex: ['any over the counter medicines', 'herbal remedies', 'supplements', 'anything from the chemist'], def: 'No.' },
  { id: 'dh.nsaids', cat: 'Drug history', q: 'Do you take anti-inflammatories like ibuprofen or aspirin?', ex: ['do you take ibuprofen', 'anti inflammatories', 'nsaids', 'aspirin', 'naproxen', 'diclofenac'], def: 'No.' },
  { id: 'dh.anticoag', cat: 'Drug history', q: 'Are you on any blood thinners?', ex: ['are you on blood thinners', 'warfarin', 'apixaban', 'rivaroxaban', 'clopidogrel', 'anticoagulants'], def: 'No.' },
  { id: 'dh.steroids', cat: 'Drug history', q: 'Do you take any steroids?', ex: ['do you take steroids', 'prednisolone', 'steroid tablets'], def: 'No.' },
  {
    id: 'dh.allergies',
    cat: 'Drug history',
    q: 'Do you have any allergies — and what happens?',
    ex: ['do you have any allergies', 'are you allergic to anything', 'any drug allergies', 'allergic to penicillin', 'what happens when you take it'],
    def: (x) => x.c.history.allergies ?? 'No, none that I know of.',
  },

  /* ---------------------------------- Family history ---------------------------------- */
  {
    id: 'fh.general',
    cat: 'Family history',
    q: 'Does anything run in your family?',
    ex: ['does anything run in the family', 'family history', 'any illnesses in your family', 'are your parents well', 'medical problems in the family'],
    def: (x) => x.c.history.fh ?? 'No, nothing that I know of.',
  },
  { id: 'fh.cancer', cat: 'Family history', q: 'Any family history of cancer, particularly bowel cancer?', ex: ['any cancer in the family', 'family history of bowel cancer', 'did anyone die of cancer'], def: 'No.' },

  /* ---------------------------------- Social history ---------------------------------- */
  {
    id: 'sh.smoking',
    cat: 'Social history',
    q: 'Do you smoke? How much and for how long?',
    ex: ['do you smoke', 'how many cigarettes a day', 'have you ever smoked', 'are you a smoker', 'do you vape', 'pack years'],
    def: (x) => x.c.history.social?.smoking ?? 'No, I’ve never smoked.',
  },
  {
    id: 'sh.alcohol',
    cat: 'Social history',
    q: 'Do you drink alcohol? How much in a typical week?',
    ex: ['do you drink alcohol', 'how much do you drink', 'how many units a week', 'do you drink', 'beer or wine'],
    def: (x) => x.c.history.social?.alcohol ?? 'Not really — the odd drink at a wedding.',
  },
  { id: 'sh.drugs', cat: 'Social history', q: 'Do you use any recreational drugs?', ex: ['do you use recreational drugs', 'any street drugs', 'cannabis', 'cocaine', 'illicit drugs'], def: (x) => x.c.history.social?.drugs ?? 'No.' },
  { id: 'sh.occupation', cat: 'Social history', q: 'What do you do for work?', ex: ['what do you do for work', 'what is your job', 'are you working', 'occupation', 'are you retired', 'what do you do for a living'], def: (x) => `I’m ${x.c.patient.occupation}.` },
  {
    id: 'sh.living',
    cat: 'Social history',
    q: 'Who do you live with at home?',
    ex: ['who do you live with', 'do you live alone', 'home situation', 'who is at home', 'do you have family nearby', 'where do you live'],
    def: (x) => x.c.history.social?.living ?? (young(x) ? 'I live with my partner.' : fem(x) ? 'With my husband.' : 'With my wife.'),
  },
  { id: 'sh.mobility', cat: 'Social history', q: 'How are you managing at home — any help with daily activities?', ex: ['how is your mobility', 'do you need help at home', 'can you manage your daily activities', 'do you use a walking aid', 'carers'], def: (x) => x.c.history.social?.mobility ?? 'I’m fully independent.' },
  { id: 'sh.travel', cat: 'Social history', q: 'Any recent travel abroad?', ex: ['any recent travel', 'been abroad recently', 'foreign travel', 'holiday recently'], def: (x) => x.c.history.social?.travel ?? 'No.' },
  { id: 'sh.diet', cat: 'Social history', q: 'What is your diet like?', ex: ['what is your diet like', 'do you eat much fibre', 'what do you normally eat', 'fatty food'], def: (x) => x.c.history.social?.diet ?? 'Pretty normal, I think.' },
  { id: 'sh.animals', cat: 'Social history', q: 'Any contact with dogs, sheep or farm animals?', ex: ['do you have any pets', 'contact with dogs', 'do you work with sheep', 'farm animals', 'do you keep animals', 'grew up on a farm'], def: 'No, no pets.' },
  { id: 'sh.weight', cat: 'Social history', q: 'What have you tried to lose weight?', ex: ['what have you tried to lose weight', 'have you tried dieting', 'weight loss attempts', 'slimming world', 'weight management programme', 'how long have you struggled with your weight'], def: 'I’ve never really needed to.' },
  { id: 'pre.last_meal', cat: 'Social history', q: 'When did you last eat or drink anything?', ex: ['when did you last eat', 'when did you last have anything to eat or drink', 'last meal', 'when did you last drink'], def: 'I had a bit of toast this morning.' },

  /* ---------------------------------------- ICE ---------------------------------------- */
  { id: 'ice.ideas', cat: 'Ideas, concerns, expectations', q: 'What do you think might be causing this?', ex: ['what do you think is going on', 'do you have any ideas what it could be', 'what do you think is causing it', 'any thoughts on what it might be'], def: (x) => x.c.history.ideas ?? 'I really don’t know — that’s why I came in.' },
  { id: 'ice.concerns', cat: 'Ideas, concerns, expectations', q: 'Is there anything in particular that’s worrying you?', ex: ['is there anything worrying you', 'what are you worried about', 'any concerns', 'what is your main worry'], def: (x) => x.c.history.concerns ?? 'Just that it might be something serious.' },
  { id: 'ice.expectations', cat: 'Ideas, concerns, expectations', q: 'What are you hoping we can do for you today?', ex: ['what are you hoping for', 'what would you like us to do', 'what are you expecting today', 'what do you hope will happen'], def: (x) => x.c.history.expectations ?? 'To find out what it is and get it sorted.' },
]

export const INTENT_BY_ID: Record<string, Intent> = Object.fromEntries(INTENTS.map((i) => [i.id, i]))

export function answerFor(id: string, c: CaseDef): Answer {
  const override = c.history.answers[id]
  if (override !== undefined) return override
  const intent = INTENT_BY_ID[id]
  if (!intent) return 'Sorry, I’m not sure what you mean.'
  // ICE shortcuts
  if (id === 'ice.ideas' && c.history.ideas) return c.history.ideas
  if (id === 'ice.concerns' && c.history.concerns) return c.history.concerns
  if (id === 'ice.expectations' && c.history.expectations) return c.history.expectations
  return typeof intent.def === 'function' ? intent.def({ c }) : intent.def
}

export const CATEGORY_ORDER: import('../engine/types').IntentCategory[] = [
  'Communication',
  'Presenting complaint',
  'Pain (SOCRATES)',
  'Gastrointestinal',
  'Urinary',
  'Gynaecological',
  'Systemic',
  'Lump',
  'Scrotal & groin',
  'Breast',
  'Thyroid & neck',
  'Vascular',
  'Anorectal',
  'Systems review',
  'Past medical history',
  'Drug history',
  'Family history',
  'Social history',
  'Ideas, concerns, expectations',
  'Closing',
]
