'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Calendar,
  Sparkles,
  Layers,
  Crown,
  Trash2,
  Edit,
  CheckCircle2,
  Flame,
  Palette,
  Moon,
  Zap,
  Gift,
  Check,
  AlertCircle,
  Monitor,
  Smartphone,
  QrCode,
  ChevronDown,
  ChevronUp,
  Radio,
  Award,
  Copy,
  Clock,
  GraduationCap,
  CheckCircle,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import '@/app/profile/profile.css';
import {
  Season,
  SeasonReward,
  AppThemeAsset,
  RewardType,
  RewardRarity,
  getStoredSeasons,
  saveStoredSeasons,
  getStoredRewards,
  saveStoredRewards,
  DEFAULT_SEASONS,
  DEFAULT_REWARDS,
  PRESET_THEME_ASSETS,
  LOCAL_ACTIVE_THEME_KEY
} from '@/lib/seasons';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = {
  pet: [
    '🐸', '🐌', '🐱', '🐱‍👓', '🐱‍🏍', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐰', '🐹', '🐻', '🐻‍❄️', '🐮', '🐷', '🐵', '🐔', 
    '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐞', '🐜', '🕷', '🕸', 
    '🐢', '🐍', '🦎', '🐙', '🦑', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', 
    '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐏', '🐑', '🐐', '🦙', '🦌', '🐈', '🐕', '🐩', '🦫', '🦦', 
    '🦥', '🦡', '🐿️', '🦔', '🦖', '🦕', '🐉', '🐈‍⬛', '🐓', '🦃', '🕊️', '🐇', '🐁', '🐀', '🦨'
  ],
  avatar: [
    '👦', '👧', '👨', '👩', '🧙', '🥷', '👾', '🤖', '🧑‍🚀', '🦸', '🧝', '🧛', '🧙‍♂️', '🧙‍♀️', '🧑‍🎨', '🧑‍🔬', '🧚', '🧞', '🧜', '🤴', '👸', '🎭',
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🫥', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽'
  ],
  theme: [
    '🌌', '🌲', '🏖️', '🌃', '🪐', '❄️', '🌋', '🌸', '🎏', '🍁', '🏜️', '🌊', '⚡', '🌙', '🎃', '🎄', '🏮', '🌈', '🎪', '🏰', '🛸',
    '🏔️', '⛰️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🌅', '🌄', '🌇', '🌆', '🌉', '🌠', '🎇', '🎆', '🎑', '🗾', '🗺️', '🪐', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌎', '🌍', '🌏', '🌟', '⭐', '💥', '🔥', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '☔', '💧', '💦'
  ],
  badge: [
    '🌱', '🔥', '🎓', '👑', '⭐', '🌟', '🎖️', '🏅', '🏆', '🥇', '🎯', '⚡', '💎', '🔑', '🛡️', '⚔️', '📦', '🎁', '🔮', '🧿', '🧬', '🧪', '🏹',
    '🥈', '🥉', '🎫', '🎟️', '🎗️', '🏵️', '🏷️', '🪙', '💵', '💴', '💶', '💷', '💸', '💳', '🧾', '✉️', '📩', '📨', '📧', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '📪', '📫', '📬', '📭', '📮', '📝', '💼', '📁', '📂', '📅', '📆', '🗒️', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🗝️', '🔨', '🛠️', '⛏️', '🔧', '🧱', '🔩', '🗜️', '⚖️', '⛓️', '🧲', '🔫', '💣', '🌡️', '🧭', '🔭', '🔬', '📡', '📢', '📣', '📯', '🛎️', '🔔', '🔕', '🎤', '🎧', '📻', '🎸', '🎹', '🎺', '🎻', '🥁', '📱', '☎️', '📞', '🔋', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '💿', '📀', '🧮', '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮'
  ]
};

const UNIQUE_EMOJIS = {
  pet: Array.from(new Set(EMOJI_CATEGORIES.pet)),
  avatar: Array.from(new Set(EMOJI_CATEGORIES.avatar)),
  theme: Array.from(new Set(EMOJI_CATEGORIES.theme)),
  badge: Array.from(new Set(EMOJI_CATEGORIES.badge))
};

// Compact mapping of keywords to enable premium search capabilities
const EMOJI_NAMES: Record<string, string> = {
  // Pets
  '🐸': 'frog toad kero jumper jump pet animal pond green',
  '🐌': 'snail slow shell crawl crawl slime garden insect bug pet',
  '🐱': 'cat kitten kitty meow purr pet animal sleep',
  '🐱‍👓': 'cyber cat hacker nerd glass pet cool smart',
  '🐱‍🏍': 'motorcycle cat racer stunt stuntman speed cool fast',
  '🐶': 'dog puppy pup bark woof pet animal loyal friend',
  '🦊': 'fox sly orange wildlife tail pet animal cunning',
  '🦁': 'lion king roar jungle predator mane pet animal brave',
  '🐯': 'tiger roar stripe predator jungle orange pet animal wild',
  '🐼': 'panda bear bamboo black white cute pet animal sleepy',
  '🐨': 'koala eucalyptus australia cute tree grey pet animal',
  '🐰': 'rabbit bunny hop ears carrot white fluff pet animal',
  '🐹': 'hamster cute rodent cheeks cage wheels pet animal',
  '🐻': 'bear grizzly brown wildlife forest predator pet animal',
  '🐻‍❄️': 'polar bear arctic ice snow white cold pet animal',
  '🐮': 'cow moo milk farm horn grass pet animal bull',
  '🐷': 'pig oink pink farm snout bacon pet animal cute',
  '🐵': 'monkey ape banana tree swing tail pet animal funny',
  '🐔': 'chicken hen cluck farm feather egg coop pet animal bird',
  '🐧': 'penguin arctic ice snow cold waddle tuxedo pet animal bird',
  '🐦': 'bird chirp wings feather sky fly tweet pet animal twitter',
  '🐤': 'chick baby yellow chicken egg feather hatch pet animal bird',
  '🦆': 'duck quack pond water feathers bill webbed pet animal bird',
  '🦅': 'eagle predator fly sky claws wings wild pet animal bird hawk',
  '🦉': 'owl wise night predator hoot tree big eyes pet animal bird',
  '🦇': 'bat night cave vampire wings fly black pet animal mammal',
  '🐺': 'wolf howl pack moon wild forest predator pack pet animal',
  '🐗': 'boar wild pig tusks forest wildlife hair pet animal',
  '🐴': 'horse gallop farm neigh ride saddle pet animal stallion',
  '🦄': 'unicorn magic fantasy horn rainbow horse sparkle fairytale',
  '🐝': 'bee honey buzz sting stripe yellow wings flower insect bug',
  '🐛': 'caterpillar worm green insect bug cocoon metamorph',
  '🦋': 'butterfly beautiful colorful wings fly insect bug cocoon cocoon',
  '🐞': 'ladybug lady beetle red spots insect bug garden',
  '🐜': 'ant colony worker tiny soil hill insect bug',
  '🕷': 'spider web legs arachnid venom crawl scary insect bug',
  '🕸': 'spiderweb web spider silk thread dust attic insect bug',
  '🐢': 'turtle tortoise shell slow sea water green sand reptile reptile',
  '🐍': 'snake serpent hiss scales rattle venom slither reptile reptile',
  '🦎': 'lizard gecko chameleon tail crawl green desert reptile reptile',
  '🐙': 'octopus eight sea ocean water ink suckers marine',
  '🦑': 'squid tentacle sea ocean water deep ink marine',
  '🦞': 'lobster red claws sea ocean water boil dinner marine',
  '🦀': 'crab pinch beach sea ocean water sand marine claws',
  '🐡': 'blowfish puffer inflate spikes sea ocean water marine',
  '🐠': 'tropical fish color coral reef sea ocean water marine swim',
  '🐟': 'fish swim gills sea ocean water river marine fins scale',
  '🐬': 'dolphin jump sea ocean water swim splash smart marine mammal',
  '🐳': 'whale blowhole spout sea ocean water giant splash blue mammal',
  '🐋': 'humpback whale sea ocean water marine giant blue mammal mammal',
  '🦈': 'shark predator teeth fins blood sea ocean water marine swim',
  '🐊': 'crocodile alligator swamp scales teeth green reptile reptile swamp',
  '🐅': 'tiger predator stripes wild cat forest zoo animal',
  '🐆': 'leopard panther spots predator wild cat forest zoo animal',
  '🦓': 'zebra stripes black white horse safari zoo animal',
  '🦍': 'gorilla silverback strong ape primate forest zoo animal',
  '🦧': 'orangutan ape orange primate hair forest zoo animal',
  '🐘': 'elephant trunk tusk giant grey safari animal mammal',
  '🦛': 'hippo hippopotamus water giant heavy river animal mammal',
  '🦏': 'rhino rhinoceros horn heavy armor safari animal mammal',
  '🐪': 'camel desert hump sand dromedary ride safari animal mammal',
  '🐫': 'camel bactrian desert double hump sand safari animal mammal',
  '🦒': 'giraffe neck tall spots yellow safari animal mammal',
  '🦘': 'kangaroo pouch jump hop australia safari animal mammal marsupial',
  '🦬': 'bison buffalo horns heavy plains native animal mammal',
  '🐏': 'ram horns sheep wool farm native animal mammal male',
  '🐑': 'sheep lamb wool baa farm white animal mammal fluffy',
  '🐐': 'goat billy beard horns farm climb animal mammal kid',
  '🦙': 'llama alpaca pack wool spit andes animal mammal cute',
  '🦌': 'deer stag buck horns forest woods animal mammal fawn',
  '🐈': 'cat meow pet animal feline kitty',
  '🐕': 'dog bark pet animal canine puppy',
  '🐩': 'poodle curly dog bark pet animal groom',
  '🦫': 'beaver river wood dam teeth brown animal mammal rodent',
  '🦦': 'otter river water swim cute whiskers brown animal mammal',
  '🦥': 'sloth slow tree hang forest claw green animal mammal sleepy',
  '🦡': 'badger burrow stripe fierce forest animal mammal',
  '🐿️': 'chipmunk squirrel acorn nuts cheeks tail animal mammal rodent',
  '🦔': 'hedgehog spikes quill roll cute desert animal mammal',
  '🦖': 'trex dinosaur predator reptile jurassic ancient giant roar',
  '🦕': 'brontosaurus dinosaur neck long giant jurassic herbivore',
  '🐉': 'dragon breathe fire scale wings myth fairytale legend green red',
  '🐈‍⬛': 'black cat witch Halloween meow pet animal dark',
  '🐓': 'rooster farm crow morning wake-up feather bird poultry',
  '🦃': 'turkey thanksgiving gobble feather farm bird poultry',
  '🕊️': 'dove peace white fly wings olive branch feather bird',
  '🐇': 'rabbit hop white ears carrot fluffy bunny pet animal',
  '🐁': 'mouse cheese white tiny rodent pet animal pest',
  '🐀': 'rat grey rodent tail pet animal pest sewers',
  '🦨': 'skunk smell stink stripe black white spray forest animal mammal',

  // Avatars & Faces
  '👦': 'boy male child kid son young student youth person avatar',
  '👧': 'girl female child kid daughter young student youth person avatar',
  '👨': 'man male adult father gentleman student gentleman person avatar',
  '👩': 'woman female adult mother lady student lady person avatar',
  '🧙': 'wizard mage witch sorcerer magic staff hat fantasy magician magic power spell avatar',
  '🥷': 'ninja assassin shadow stealth katana mask blade warrior fighter agent espionage avatar',
  '👾': 'alien space invader game pixel retro monster arcade arcade classic avatar',
  '🤖': 'robot machine android bot steel AI future cyber brain electronic metal avatar',
  '🧑‍🚀': 'astronaut space shuttle astronaut helmet rocket cosmos star pilot explorer avatar',
  '🦸': 'superhero hero cape champion power brave comic marvel dc save avatar',
  '🧝': 'elf ears fantasy woodland archer lotr wood legolas high magic avatar',
  '🧛': 'vampire dracula fangs blood cape bat gothic twilight castle avatar',
  '🧙‍♂️': 'wizard mage sorcerer male hat magic spell staff fantasy avatar',
  '🧙‍♀️': 'witch sorceress female hat magic spell wand fantasy avatar',
  '🧑‍🎨': 'artist palette paintbrush paint brush canvas draw color sketch avatar',
  '🧑‍🔬': 'scientist lab beaker test tube research chemist biology physicist smart genius avatar',
  '🧚': 'fairy wings magic dust pixie pixie wand fairytale fly tinkerbell avatar',
  '🧞': 'genie lamp wish magic giant spirit blue arabian grant avatar',
  '🧜': 'mermaid merman sea siren water swim tail ocean aquatic avatar',
  '🤴': 'prince crown royalty king royal gold noble rich palace boy avatar',
  '👸': 'princess crown royalty queen royal gold noble tiara palace girl avatar',
  '🎭': 'theater mask drama comedy tragedy stage performance actor play opera',
  '😀': 'face smile happy grin laugh joy positive cheerful friendly',
  '😃': 'face smile happy grin open mouth excited glad cheerful',
  '😄': 'face smile happy grin squint eyes laugh friendly positive',
  '😁': 'face smile happy grin teeth proud glad smug positive',
  '😆': 'face smile happy laugh squint eyes fun joyful hilarious',
  '😅': 'face smile happy sweat nervous awkward relief glad',
  '😂': 'face tear joy laugh cry crying happy hilarious funny',
  '🤣': 'face roll floor laughing laugh hilarious funny side split',
  '😊': 'face smile happy blush cheeks sweet warm friendly content',
  '😇': 'face halo angel innocent good holy saint celestial',
  '🙂': 'face smile slight friendly happy simple content warm',
  '🙃': 'face upside down silly flip crazy sarcastic ironic',
  '😉': 'face wink flirt friendly playful hint teasing',
  '😌': 'face relieved peace calm sigh rest sleep relaxed soothe',
  '😍': 'face heart eyes love adoration adore romantic crush',
  '🥰': 'face hearts love warm romantic sweet crush cute',
  '😘': 'face kiss blowing heart love romance romantic warm',
  '😗': 'face kiss lips friendly simple love romance',
  '😙': 'face kiss squint eyes smile love romance friendly',
  '😚': 'face kiss closed eyes blush love romance sweet',
  '😋': 'face tongue delicious food yum taste hungry licking lips',
  '😛': 'face tongue playful tease silly fun joke joking',
  '😝': 'face tongue squint eyes crazy silly fun joke',
  '😜': 'face tongue wink crazy playful tease silly fun',
  '🤪': 'face crazy zany goofy wild wacky goofy eyes',
  '🤨': 'face eyebrow raise suspicious skeptical doubt question',
  '🧐': 'face monocle detective investigator inspect fancy smart classy',
  '🤓': 'face nerd glass smart brain teeth study geek book academic',
  '😎': 'face sunglass cool chill sunglasses sun summer beach rockstar',
  '🥸': 'face disguise mask glasses mustache fake spy detective',
  '🤩': 'face star eyes starstruck amazed starry wow exciting',
  '🥳': 'face party horn hat blower celebration birthday confetti festival',
  '😏': 'face smirk smirking half-smile cheeky sassy clever sly',
  '😒': 'face unamused unhappy annoyed blank bored sigh unimpressed',
  '😞': 'face disappointed sad regret frown sorry depressed upset',
  '😔': 'face pensive sad worry downcast deep thought sorrow',
  '😟': 'face worried sad anxious fear concern uneasy',
  '😕': 'face confused unsure puzzle query perplex query',
  '🙁': 'face frown slight sad unhappy disappointed',
  '☹️': 'face frown heavy sad unhappy despair grieve',
  '😣': 'face persevere struggle stress hard tight-lipped tough',
  '😖': 'face confounded struggle pain cringe annoyed stress',
  '😫': 'face tired exhaust weary groan fed up yawn sleep',
  '😩': 'face weary tired exhaust moan weep whine sad',
  '🥺': 'face plead beg cute puppy eyes soft sweet please cry',
  '😢': 'face tear cry crying sad weep sorrow hurt upset',
  '😭': 'face tears sob crying heavy cry loud hysterical bawl',
  '😤': 'face steam nose pride win victory anger rage proud',
  '😠': 'face angry mad annoyed cross temper vexed',
  '😡': 'face pout angry mad rage furious boiling temper',
  '🤬': 'face censor curse swear bad words angry rage mouth symbol',
  '🤯': 'face mind blown explode brain shock wow amazing surprise',
  '😳': 'face flushed blush red cheeks surprise shock embarrassed',
  '🥵': 'face hot red sweat fever sun summer boil thirst warm',
  '🥶': 'face cold blue ice frost winter shiver freeze draft',
  '😱': 'face scream fear shock horror gasp scared home alone ghost',
  '😨': 'face fearful scared fright shock shake panic dread',
  '😰': 'face blue sweat fear worry anxious strain stressful',
  '😥': 'face sad sweat relief sorrow sweat worry close call',
  '😓': 'face sweat cold sweat stress hard work exhaust heavy',
  '🤗': 'face hug hands open warm embrace friendship welcome happy',
  '🤔': 'face think ponder wonder logic doubt question brain logic',
  '🫣': 'face peeking eye covered spy hide afraid look watch',
  '🤭': 'face hand mouth giggle oops shock giggle secret whisper',
  '🤫': 'face shush quiet silence whisper secret hush mute',
  '🤥': 'face lie pinocchio long nose fake dishonest cheat tell-tale',
  '😶': 'face blank mouth silent quiet speech quiet secret',
  '😐': 'face neutral expressionless blank stoneface boring bored okay',
  '😑': 'face expressionless squint flatline blank poker face bored',
  '😬': 'face grimace oops nervous tight awkward teeth cringe clench',
  '🫠': 'face melting hot sink dissolve disappear warm summer',
  '🙄': 'face roll eyes bored annoyed sarcasm passive-aggressive sigh',
  '😯': 'face hush gasp surprise surprise wonder quiet speak',
  '😦': 'face open mouth slight surprise frown anxious alert',
  '😧': 'face anguish sad worry pain regret sorrow fear stress',
  '😮': 'face open mouth surprise gasp shock amazing wow',
  '😲': 'face astonished surprise wonder shock amazed wide eyes',
  '🥱': 'face yawn tired sleepy sleep boring exhaust wake up',
  '😴': 'face sleep snoring zzz rest dream bedtime blanket',
  '🤤': 'face drool hungry sleep sweet tasty delicious yummy',
  '😪': 'face sleepy bubble tear resting doze nap sleep',
  '😵': 'face dizzy dead cross eyes shock faint sick spin',
  '😵‍💫': 'face spiral eyes dizzy loop spin maze sick confusion',
  '🫥': 'face dotted line transparent hide invisible fade ghost vanish',
  '🤐': 'face zipper mouth secret silent quiet seal lock speak-no',
  '🥴': 'face woozy drunk dizzy sick weird green loop uneven',
  '🤢': 'face nauseous sick green vomit throw up illness stomach',
  '🤮': 'face vomit throw up barf sick illness green poison',
  '🤧': 'face sneeze allergy tissue cold flu sick sniffle',
  '😷': 'face mask surgical doctor protection virus sick flu safety',
  '🤒': 'face thermometer sick fever warmth warm flu hospital doctor',
  '🤕': 'face bandage head hurt injury wound hospital accident medical',
  '🤑': 'face money dollar bank cash rich gold wealthy currency',
  '🤠': 'face cowboy hat sheriff western horse rodeo wild west texas',
  '😈': 'devil purple horns smile evil demon mischief prank naughty satan',
  '👿': 'devil angry purple horns demon rage evil furious satan',
  '👹': 'ogre monster mask red devil horn fangs scary folklore holloween',
  '👺': 'goblin mask red long nose devil scary fangs folklore holloween',
  '🤡': 'clown circus makeup red nose funny scary joke party costume',
  '💩': 'poop piece of turd dung brown smiley stinky pile funny',
  '👻': 'ghost spooky white ghoul phantom Halloween scary spirit float',
  '💀': 'skull bone skeleton death dead danger head bone pirate gothic',
  '☠️': 'skull crossbones poison toxin lethal dangerous death pirate flags',
  '👽': 'alien outer space extraterrestrial ufo martian creature sci-fi',

  // Themes
  '🌌': 'space galaxy nebula star sky milky way cosmos night retro purple dark',
  '🌲': 'forest wood trees evergreen pine cedar rustic camping nature green',
  '🏖️': 'beach sand island ocean sun umbrella summer vacation sea tropical',
  '🌃': 'city night skyline buildings skyscraper lights downtown urban dark',
  '🪐': 'saturn planet space cosmic ring orbit universe orbit',
  '❄️': 'snowflake ice winter snow cold crystal freeze blizzard',
  '🌋': 'volcano lava eruption fire mountain smoke magma hot rock',
  '🌸': 'cherry blossom flower bloom pink spring nature cherry floral',
  '🎏': 'carp streamer fish wind holiday banner koinobori festival decoration japanese',
  '🍁': 'maple leaf autumn fall orange nature foliage tree forest',
  '🏜️': 'desert oasis sand dune hot sun camel arid canyon dry',
  '🌊': 'wave water ocean splash tsunami surf beach storm ripple sea',
  '⚡': 'lightning bolt thunder shock power energy electricity speed storm flash flash',
  '🌙': 'crescent moon night sleep space dark gold dream star twilight',
  '🎃': 'jack lantern pumpkin halloween spooky autumn fall orange carve candle',
  '🎄': 'christmas tree winter pine holiday gift santa decoration light ornament',
  '🏮': 'red lantern lamp light light neon glow festival oriental asia china paper',
  '🌈': 'rainbow pride color sky rain weather bridge spectrum lgbt',
  '🎪': 'circus tent carousel carnival show performance arena festival fun fair',
  '🏰': 'castle fortress tower kingdom stone royalty palace medieval medieval tower',
  '🛸': 'ufo saucer flying alien spaceship space rocket cosmic abduction',
  '🏔️': 'snow mountain alp peak winter ice summit cold climb peak',
  '⛰️': 'mountain rock hill climb peak highland land summit climb',
  '🗻': 'mount fuji volcano japan peak summit mountain snow landmark',
  '🏕️': 'camping tent campsite forest woods campfire outdoor sleeping bag',
  '⛺': 'tent camp campsite camping shelter outdoor shelter bivouac',
  '🛖': 'hut cabin shelter roof straw mud tribal rustic housing',
  '🏠': 'house home building live residence family roof door suburb',
  '🏡': 'house garden yard tree home family lawn live grass suburb',
  '🏢': 'office building business work corporate tower skyscraper structure',
  '🏣': 'japanese post office mail envelope stamps letter building',
  '🏤': 'european post office building mail delivery letter envelope stamp',
  '🏥': 'hospital medicine clinic doctor nurse emergency Red Cross health building',
  '🏦': 'bank money vault cash finance safe loan currency building',
  '🏨': 'hotel bed holiday lodging travel resort suite accommodation building',
  '🏪': 'convenience store market food shop 24/7 night groceries building',
  '🏫': 'school classroom study book learn blackboard uniform college building academy',
  '🏬': 'department store shopping center plaza mall boutique retail building',
  '🏭': 'factory smoke industrial manufacture chimney pollution steel plant energy building',
  '🏯': 'japanese castle palace fortress architecture landmark history tourist asian building',
  '🏟️': 'stadium sports soccer field arena concert crowd match building seat',
  '🎡': 'ferris wheel amusement park carnival fair festival ride wheel view',
  '🎢': 'roller coaster thrill amusement park ride railroad loop carnival scream',
  '🎠': 'carousel horse ride amusement park carnival fair roundabout music',
  '⛲': 'fountain water spray park plaza square ripple splash stone',
  '⛱️': 'umbrella beach sun sunshade summer shelter ground beach',
  '🌅': 'sunrise sun morning dawn skyline horizon light yellow sun',
  '🌄': 'sunrise mountain morning peak daylight landscape sun climb',
  '🌇': 'sunset city buildings skyline golden hour evening horizon sun',
  '🌆': 'cityscape twilight skyline buildings sunset evening downtown urban',
  '🌉': 'bridge suspension river bay ocean crossing road steel structure',
  '🌠': 'shooting star wish sky space speed streak trail flash',
  '🎇': 'sparkler firework flame spark sparkle celebration holiday party light',
  '🎆': 'firework explosion sky dark party celebrate festival new year light',
  '🎑': 'moon viewing ceremony grass rice dumpling sky rabbit festival',
  '🗾': 'japan map island country nation geography land travel',
  '🗺️': 'world map globe travel adventure coordinate geography atlas land',
  '🌕': 'full moon night light bright space orb round sphere celestial',
  '🌖': 'gibbous moon night space orbital eclipse phase crescent',
  '🌗': 'half moon night space orbital eclipse phase quarter crescent',
  '🌘': 'crescent moon night space orbital eclipse phase slender',
  '🌑': 'new moon dark night space orbital eclipse phase shadow black',
  '🌒': 'crescent moon night space orbital eclipse phase young crescent',
  '🌓': 'half moon night space orbital eclipse phase first quarter crescent',
  '🌔': 'gibbous moon night space orbital eclipse phase waxing crescent',
  '🌎': 'globe earth americas world space planet continent land ocean',
  '🌍': 'globe earth europe africa world space planet continent land ocean',
  '🌏': 'globe earth asia australia world space planet continent land ocean',
  '🌟': 'sparkling star bright glitter shine gold sky space magic award ranking',
  '⭐': 'star gold yellow sky space shine merit rate award win review',
  '💥': 'collision explosion crack bang pop hit punch damage blast',
  '🔥': 'fire flame hot warm burn campfire heat spark matches element',
  '☀️': 'sun summer hot daylight heat weather sunny sky bright warm',
  '🌤️': 'sun behind small cloud weather partial overcast sky summer',
  '⛅': 'sun behind cloud weather partial overcast sky silver cloud',
  '🌥️': 'sun behind large cloud weather overcast dark cloud grey sky',
  '☁️': 'cloud weather sky grey white damp rain fog shade steam',
  '🌦️': 'sun behind rain cloud weather shower drizzle wet summer rainbow',
  '🌧️': 'rain cloud weather wet drop water storm shower puddle',
  '⛈️': 'thunder rain cloud weather storm lightning wet electricity flash flash',
  '🌩️': 'lightning cloud weather storm thunder light flash energy shock',
  '☃️': 'snowman snow winter holiday ice cold flake white frost',
  '⛄': 'snowman winter holiday ice cold waddle flake white frost',
  '🌬️': 'wind face blow draft breeze weather gust storm storm',
  '💨': 'dash run smoke vapor dust puff speed quick fast escape',
  '🌪️': 'tornado funnel storm vortex wind cyclone hurricane hazard danger',
  '🌫️': 'fog mist haze weather dim gray obscure steam steam',
  '☔': 'umbrella rain drop water wet shelter weather puddle splash',
  '💧': 'droplet water rain tear sweat blue clean splash fluid leak',
  '💦': 'sweat drops water splash spray active work shower exercise sport',

  // Badges & Symbols
  '🌱': 'seedling sprout plant grow spring leaf green soil nature garden',
  '🔥': 'fire streak active hot streak burn popular flame warmth',
  '🎓': 'graduation cap university college school diploma degree study learn smart student principal',
  '👑': 'crown king queen royal royalty noble gold rich diamond jewel victory champion',
  '⭐': 'star gold rate review favorite winner top success badge',
  '🌟': 'glowing star sparkle gold rating shine success premium ranking',
  '🎖️': 'military medal honor service brave nation soldier award bronze silver gold',
  '🏅': 'sports medal award bronze silver gold coin ribbon win success rate champion',
  '🏆': 'trophy cup gold award winner champion prize contest victory success rank',
  '🥇': 'first place medal gold winner champion prize coin rank primary',
  '🎯': 'target bullseye dart goal hit accuracy focus spot success center score',
  '⚡': 'lightning energy power electric quick speed fast thunder flash zap charge',
  '💎': 'gem stone diamond crystal sapphire ruby jewel precious shiny stone premium luxury wealth',
  '🔑': 'key lock unlock secret door password access safety secure gold metal',
  '🛡️': 'shield armor protect defense secure guard safety knight war metal',
  '⚔️': 'crossed swords combat battle war weapons fight blade metal knight duel',
  '📦': 'package box delivery cardboard container mail parcel post ship transport storage',
  '🎁': 'gift present ribbon bow birthday Christmas box surprise package celebrate holiday',
  '🔮': 'crystal ball crystal fortune teller future psychic magic wizard witch potion glass orb sphere',
  '🧿': 'nazar amulet evil eye protection luck guard blue glass eye turkey greek',
  '🧬': 'dna double helix gene chromosome biology science biotech research life medical',
  '🧪': 'test tube experiment lab science research chemistry compound beaker fluid glass',
  '🏹': 'bow arrow archery hunting target weapon shoot launch flight sport',
  '🥈': 'second place medal silver runner up coin ribbon award rank',
  '🥉': 'third place medal bronze runner up coin ribbon award rank',
  '🎫': 'ticket admission voucher movie cinema event concert pass strip coupon',
  '🎟️': 'tickets admission cinema theater concert sports show coupon entry pass',
  '🎗️': 'reminder ribbon support awareness health gold yellow ribbon loops',
  '🏵️': 'rosette flower award ribbon medal gold decoration star blossom',
  '🏷️': 'tag label price sale ticket identity coupon string mark paper',
  '🪙': 'coin money currency gold silver bronze cash treasure metallic cent',
  '💵': 'dollar bill cash money bank green roll currency paper wealth',
  '💴': 'yen bill money cash bank japan currency paper green wealth',
  '💶': 'euro bill money cash bank europe currency paper blue wealth',
  '💷': 'pound bill money cash bank uk england currency paper purple wealth',
  '💸': 'flying money wealth cash loss bill green wings spend cash outflow',
  '💳': 'credit card debit bank plastic payment cash swipe swipe commerce visa chip',
  '🧾': 'receipt bill invoice record tax payment buy paper register accounting',
  '✉️': 'envelope letter mail post envelope message write postbox stamps paper card',
  '📩': 'incoming mail letter message envelope inbox receive arrow delivery card',
  '📨': 'incoming message letter mail envelope receive inbox stamp delivery card',
  '📧': 'email letter envelope mail electronic computer send internet address',
  '🎈': 'balloon helium float string party birthday surprise celebrate kids red',
  '🎀': 'ribbon bow pink girlish gift wrap decoration hair tie sweet lace',
  '🎊': 'confetti ball celebrate explosion party holiday wedding birthday surprise spark',
  '🎉': 'party popper celebrate explosion confetti holiday wedding birthday surprise spark',
  '🎎': 'japanese dolls hinamatsuri girl festival ornament imperial royalty traditional',
  '🏮': 'red lantern lamp light glow festival asian oriental china paper lantern',
  '🎐': 'wind chime glass bell summer breeze wind music decoration window',
  '🧧': 'red envelope packet lucky money gift chinese new year spring celebrate',
  '📪': 'mailbox closed post mail delivery envelope letter box metallic postbox',
  '📫': 'mailbox open flag post mail delivery envelope letter box metallic postbox',
  '📬': 'mailbox open mailbox letter inside envelope mail post delivery metallic box',
  '📭': 'mailbox empty mailbox flag down post delivery mail box envelope letter',
  '📮': 'postbox mailbox letterbox red post mail delivery message mail slot',
  '📝': 'memo pencil pad write draft note essay document letter paper text office',
  '💼': 'briefcase case work office business executive legal professional travel documentbag',
  '📁': 'folder file document paper office sheet tab storage organization archive',
  '📂': 'open folder file document paper office storage catalog sheet catalog tab archive',
  '📅': 'calendar date sheet schedule plan agenda month day office time',
  '📆': 'tear-off calendar day date month sheet schedule schedule agenda card',
  '🗒️': 'spiral notepad paper write pad block notes memo diary draft office',
  '📈': 'upward trend chart graph growth rise profit metrics statistics market finance stock',
  '📉': 'downward trend chart graph decline loss decrease metrics market finance stock',
  '📊': 'bar chart graph compare metrics finance sales performance office layout sheet',
  '📋': 'clipboard checklist board task write check complete list tick report paper',
  '📌': 'pushpin thumbtack board note pin wall mark paper memo needle metal red',
  '📍': 'round pushpin map pin locate point spot mark needle board red wall',
  '📎': 'paperclip clip metal binder fastener sheet paper hold office steel wire',
  '🖇️': 'linked paperclips chain link connection together tie hold binder metal wire',
  '📏': 'straight ruler measure length scale school math line inch centimeter grid',
  '📐': 'triangular ruler set square measure geometry math angle school grid drawing',
  '✂️': 'scissors cut blade paper clip crop metal tailor hair designer tool',
  '🗃️': 'card file box archive records index catalog drawer library organizing container',
  '🗄️': 'file cabinet metal drawers office archive storage document cabinet records',
  '🗑️': 'wastebasket trash can dustbin rubbish bin discard dump empty container junk',
  '🔒': 'padlock lock closed secure safety privacy password key keyhole steel',
  '🔓': 'open padlock lock unlock access free privacy security hazard keyhole',
  '🔏': 'lock with pen secure write document sign sign privacy lock secure auth',
  '🔐': 'closed lock key security key credentials secure authorize safe secret password',
  '🗝️': 'old key antique lock secret clue door castle keyhole mystery metal',
  '🔨': 'hammer tool nail build craft construct fix break judge auction gavel metal',
  '🛠️': 'hammer wrench tool repair maintenance mechanic workshop fix garage construct hardware',
  '⛏️': 'pickaxe pick tool miner digging quarry diamond mine rock ore stone',
  '🔧': 'wrench spanner tool nut bolt tighten mechanical engineering repair garage fix',
  '🧱': 'brick wall masonry construction building block red stone barrier structure',
  '🔩': 'nut bolt screw thread fastener hardware repair tool garage metal steel',
  '🗜️': 'clamp vice tool press squeeze hold woodworking metalworking workshops mechanical',
  '⚖️': 'balance scale judge trial law legal weight justice equality measure court',
  '⛓️': 'chains iron shackles links connect slave bond lock prisoner limit bound',
  '🧲': 'magnet force gravity field physics pull metal iron science horseshoe red',
  '🔫': 'pistol water gun squirt gun toy green yellow spray shoot fight weapon',
  '💣': 'bomb explode fuse spark lit black steel blast dangerous war countdown',
  '🌡️': 'thermometer mercury temperature weather hot cold medical scale degree warmth',
  'Compass': 'compass direction navigation travel map north south card wind marine sea find',
  '🔭': 'telescope space astronomy star planet cosmos lens view scope look scientific',
  '🔬': 'microscope science laboratory biology small bacteria cell research lens scope',
  '📡': 'satellite dish antenna signal broadcast receiver communication space network television',
  '📢': 'loudspeaker megaphone volume announcement sound alert news public broadcast',
  '📣': 'megaphone cheer volume shout announcement sound public rally cheerlead',
  '📯': 'postal horn post carriage horn brass mail postage ancient signals trumpets',
  '🛎️': 'service bell hotel reception ring call press counter lobby desk brass',
  '🔔': 'bell church alarm ring gold chime sound wake-up notification metal',
  '🔕': 'silent bell mute alarm off volume quiet silent zone notify sound-off',
  '🎤': 'microphone mic sing music karaoke audio sound vocal performance stage',
  '🎧': 'headphone earphone music audio sound studio dj gamer hear listen head-gear',
  '📻': 'radio broadcast antenna retro music news sound dial receiver tuner',
  '🎸': 'guitar acoustic electric rock music string pop instruments bass perform',
  '🎹': 'keyboard piano synth music notes key black white instruments perform',
  '🎺': 'trumpet brass wind instruments jazz blow orchestra fanfare classical perform',
  '🎻': 'violin cello string bow orchestra classical music performance instrument',
  '🥁': 'drum snare stick percussion rhythm beat music rock instruments performance',
  '📱': 'mobile phone smartphone screen cellular call internet device modern tech',
  '☎️': 'telephone classic landline call ring dial receiver black voice wire',
  '📞': 'telephone receiver call sound talk voice dial speak communications green',
  '📠': 'fax machine printer paper telecopier documents office transmission dial lines',
  '🔋': 'battery power energy charge cell electricity grid capacity juice green',
  '🔌': 'electric plug cord wire outlet charge electricity current power connection adapter',
  '💻': 'computer laptop keyboard screen workspace developer coder programming tech internet',
  '🖥️': 'desktop computer monitor screen workstation server mainframe displays electronics',
  '🖨️': 'printer printing paper office documents ink scan scanner copies device',
  '⌨️': 'keyboard typing typing input buttons office device console mechanical board',
  '🖱️': 'computer mouse cursor clicking pointer desktop device electronics optic buttons',
  '💿': 'optical disc cd dvd backup software movie record gold laser disc drive',
  '📀': 'dvd optical blue-ray film backup video record gold silver medium disk',
  '🧮': 'abacus math calculating slide count arithmetic ancient school tool grid beads',
  '🎥': 'movie camera cinema film rolls director Hollywood screen projection production',
  '🎞️': 'film strips cinema movie slide negative photos rolls camera performance',
  '📽️': 'film projector screen cinema movie old classic slides lens light beam',
  '🎬': 'clapperboard movie shoot action scene slate film production Hollywood cut',
  '📺': 'television tv screen antenna retro tube broadcasting channel set displays',
  '📷': 'camera lens shutter capture photograph portrait travel device flash memory',
  '📸': 'camera with flash flash capture photograph snapshot portrait travel device lens',
  '📹': 'video camera recorder tape camcorder movie media recording lens film',
  ' cassette': 'videocassette tape vhs recorder movie film classic player analog media',
  '🔍': 'magnifying glass search look spy inspector zoom detail lens find searcher',
  '🔎': 'magnifying glass right zoom detail search lens find searcher scan inspector',
  '🕯️': 'candle flame light wax melt candlewick flame burn dark scent classic',
  '💡': 'light bulb lamp idea brainstorm glow wire yellow invent bright glass',
  'Flashlight': 'flashlight torch beam light dark search battery electric yellow spot',
} as const;

export default function AdminSeasonsPage() {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const firestore = useFirestore();
  const [activeTheme, setActiveTheme] = useState<string>('default');

  // Themes Library State
  const [libraryThemes, setLibraryThemes] = useState<AppThemeAsset[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'special' | 'regular'>('special');

  // New Season Modal Form
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [seasonTitle, setSeasonTitle] = useState('');
  const [seasonDescription, setSeasonDescription] = useState('');
  const [seasonStartDate, setSeasonStartDate] = useState('2026-09-01');
  const [seasonEndDate, setSeasonEndDate] = useState('2026-12-31');
  const [seasonCap, setSeasonCap] = useState(80);
  const [seasonColor, setSeasonColor] = useState('#22c55e');

  // New Reward Modal Form
  const [newRewardOpen, setNewRewardOpen] = useState(false);
  const [rewardSeasonId, setRewardSeasonId] = useState('season_1');
  const [rewardLevel, setRewardLevel] = useState(10);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('pet');
  const [rewardRarity, setRewardRarity] = useState<RewardRarity>('Rare');
  const [rewardIcon, setRewardIcon] = useState('🐸');
  const [rewardPetQuote, setRewardPetQuote] = useState('');
  const [rewardAnimationType, setRewardAnimationType] = useState<'bounce' | 'crawl' | 'sleep' | 'flutter' | 'fire' | 'none'>('bounce');
  const [rewardThemeClass, setRewardThemeClass] = useState('theme_test_forest');

  // New Reward states for Requirements (Stage 2)
  const [rewardRequirementType, setRewardRequirementType] = useState<'level' | 'checkin' | 'tests' | 'courses'>('level');
  const [rewardRequirementValue, setRewardRequirementValue] = useState<number>(10);
  const [rewardRequireLevel, setRewardRequireLevel] = useState<boolean>(true);

  // New Theme Modal Form
  const [newThemeOpen, setNewThemeOpen] = useState(false);
  const [themeTitleInput, setThemeTitleInput] = useState('');
  const [themeDescInput, setThemeDescInput] = useState('');
  const [themeCategoryInput, setThemeCategoryInput] = useState<'special' | 'regular'>('regular');
  const [themeClassInput, setThemeClassInput] = useState('');
  const [themePreviewBgInput, setThemePreviewBgInput] = useState('linear-gradient(135deg, #022c22, #064e3b)');
  const [themeAccentInput, setThemeAccentInput] = useState('#22c55e');

  // Rich theme customization options
  const [themeBgType, setThemeBgType] = useState<'solid' | 'gradient' | 'cyber'>('gradient');
  const [themeBgStartColor, setThemeBgStartColor] = useState('#0a0d13');
  const [themeBgEndColor, setThemeBgEndColor] = useState('#020408');
  const [themeGradientAngle, setThemeGradientAngle] = useState('135');
  const [themeCardBgColor, setThemeCardBgColor] = useState('#13161c');
  const [themeBorderColor, setThemeBorderColor] = useState('#272c36');
  const [themeTextColor, setThemeTextColor] = useState('#f8fafc');
  const [themeGlowIntensity, setThemeGlowIntensity] = useState<'none' | 'subtle' | 'vivid' | 'neon'>('none');
  const [themeGridPattern, setThemeGridPattern] = useState<'none' | 'dots' | 'lines' | 'stars' | 'cyber'>('dots');
  const [themeFontFamily, setThemeFontFamily] = useState<'sans' | 'space' | 'mono' | 'serif'>('sans');
  const [themeGlassBlur, setThemeGlassBlur] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  const [themeSprinkles, setThemeSprinkles] = useState<'none' | 'sparkles' | 'stars' | 'glow'>('none');

  // Granular Per-Card Customizations for the profile cards
  const [themeCardCustomizations, setThemeCardCustomizations] = useState<Record<string, CardCustomization>>({});
  const [selectedCardTarget, setSelectedCardTarget] = useState<'avatar_badge' | 'season_hero' | 'badges' | 'learning_track' | 'performance' | 'registry'>('season_hero');
  const [builderTab, setBuilderTab] = useState<'global' | 'cards'>('global');
  const [cardEmojiSearch, setCardEmojiSearch] = useState('');
  const [themeAutoActivateGlobal, setThemeAutoActivateGlobal] = useState(false);
  const [simulatorDeviceMode, setSimulatorDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [simulatorThemeMode, setSimulatorThemeMode] = useState<'dark' | 'light'>('dark');
  const [simMilestonesExpanded, setSimMilestonesExpanded] = useState(false);

  // Preset Template Loader Helper
  const loadThemePreset = (presetName: string) => {
    if (presetName === 'ramadan') {
      setThemeTitleInput('Ramadan Night');
      setThemeDescInput('Blessed twilight atmosphere with luminous gold crescent accents');
      setThemeClassInput('theme_ramadan_night');
      setThemeCategoryInput('special');
      setThemeBgType('gradient');
      setThemeBgStartColor('#070919');
      setThemeBgEndColor('#0f1538');
      setThemeGradientAngle('145');
      setThemeCardBgColor('#0e1329');
      setThemeBorderColor('#2a3563');
      setThemeTextColor('#f1f5f9');
      setThemeAccentInput('#f59e0b');
      setThemeFontFamily('serif');
      setThemeGridPattern('stars');
      setThemeGlassBlur('lg');
      setThemeGlowIntensity('vivid');
      setThemeSprinkles('stars');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '🌙', badgePosition: 'top-right', sprinkles: 'stars', glowIntensity: 'vivid' },
        avatar_badge: { badgeEmoji: '⭐', badgePosition: 'top-right' },
        badges: { badgeEmoji: '🕌', badgePosition: 'top-right' },
        registry: { badgeEmoji: '✨', badgePosition: 'top-right' }
      });
    } else if (presetName === 'cyberpunk') {
      setThemeTitleInput('Cyberpunk Neon');
      setThemeDescInput('Futuristic high-voltage grid with neon magenta and cyan currents');
      setThemeClassInput('theme_cyberpunk_neon');
      setThemeCategoryInput('special');
      setThemeBgType('cyber');
      setThemeBgStartColor('#090014');
      setThemeBgEndColor('#1a0033');
      setThemeCardBgColor('#120324');
      setThemeBorderColor('#ff007f');
      setThemeTextColor('#fdf4ff');
      setThemeAccentInput('#ff007f');
      setThemeFontFamily('mono');
      setThemeGridPattern('cyber');
      setThemeGlassBlur('md');
      setThemeGlowIntensity('neon');
      setThemeSprinkles('glow');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '⚡', badgePosition: 'top-right', sprinkles: 'glow', glowIntensity: 'neon' },
        learning_track: { badgeEmoji: '👾', badgePosition: 'top-right' },
        performance: { badgeEmoji: '🕹️', badgePosition: 'top-right' },
        avatar_badge: { badgeEmoji: '🤖', badgePosition: 'top-left' }
      });
    } else if (presetName === 'halloween') {
      setThemeTitleInput('Halloween Shadow');
      setThemeDescInput('Mysterious midnight pumpkin realm with spooky embers');
      setThemeClassInput('theme_halloween_shadow');
      setThemeCategoryInput('special');
      setThemeBgType('gradient');
      setThemeBgStartColor('#100702');
      setThemeBgEndColor('#240d04');
      setThemeGradientAngle('135');
      setThemeCardBgColor('#190b04');
      setThemeBorderColor('#ea580c');
      setThemeTextColor('#fff7ed');
      setThemeAccentInput('#ea580c');
      setThemeFontFamily('mono');
      setThemeGridPattern('stars');
      setThemeGlassBlur('md');
      setThemeGlowIntensity('vivid');
      setThemeSprinkles('sparkles');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '🎃', badgePosition: 'top-right', sprinkles: 'sparkles', glowIntensity: 'vivid' },
        avatar_badge: { badgeEmoji: '🦇', badgePosition: 'top-right' },
        badges: { badgeEmoji: '👻', badgePosition: 'top-right' },
        learning_track: { badgeEmoji: '🕷️', badgePosition: 'top-right' }
      });
    } else if (presetName === 'winter') {
      setThemeTitleInput('Winter Frost');
      setThemeDescInput('Crystalline frozen slate with arctic blue highlights');
      setThemeClassInput('theme_winter_frost');
      setThemeCategoryInput('regular');
      setThemeBgType('gradient');
      setThemeBgStartColor('#071321');
      setThemeBgEndColor('#0e243b');
      setThemeGradientAngle('160');
      setThemeCardBgColor('#0c1b2d');
      setThemeBorderColor('#38bdf8');
      setThemeTextColor('#f0f9ff');
      setThemeAccentInput('#0284c7');
      setThemeFontFamily('space');
      setThemeGridPattern('dots');
      setThemeGlassBlur('lg');
      setThemeGlowIntensity('subtle');
      setThemeSprinkles('stars');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '❄️', badgePosition: 'top-right', sprinkles: 'stars', glowIntensity: 'subtle' },
        avatar_badge: { badgeEmoji: '⛄', badgePosition: 'top-right' },
        learning_track: { badgeEmoji: '🧊', badgePosition: 'top-right' },
        performance: { badgeEmoji: '🌨️', badgePosition: 'top-right' }
      });
    } else if (presetName === 'desert') {
      setThemeTitleInput('Desert Amber');
      setThemeDescInput('Sun-drenched dunes and golden sand crystals');
      setThemeClassInput('theme_desert_amber');
      setThemeCategoryInput('regular');
      setThemeBgType('gradient');
      setThemeBgStartColor('#140d04');
      setThemeBgEndColor('#261706');
      setThemeGradientAngle('135');
      setThemeCardBgColor('#1c1105');
      setThemeBorderColor('#bf7c1c');
      setThemeTextColor('#fefce8');
      setThemeAccentInput('#bf7c1c');
      setThemeFontFamily('space');
      setThemeGridPattern('dots');
      setThemeGlassBlur('md');
      setThemeGlowIntensity('subtle');
      setThemeSprinkles('sparkles');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '🏜️', badgePosition: 'top-right', sprinkles: 'sparkles' },
        avatar_badge: { badgeEmoji: '🐪', badgePosition: 'top-right' },
        registry: { badgeEmoji: '☀️', badgePosition: 'top-right' }
      });
    } else if (presetName === 'cosmic') {
      setThemeTitleInput('Cosmic Nebula');
      setThemeDescInput('Interstellar voyage through deep violet galaxies and pulsar dust');
      setThemeClassInput('theme_cosmic_nebula');
      setThemeCategoryInput('special');
      setThemeBgType('gradient');
      setThemeBgStartColor('#090314');
      setThemeBgEndColor('#1b0838');
      setThemeGradientAngle('135');
      setThemeCardBgColor('#14062a');
      setThemeBorderColor('#a855f7');
      setThemeTextColor('#faf5ff');
      setThemeAccentInput('#c084fc');
      setThemeFontFamily('space');
      setThemeGridPattern('stars');
      setThemeGlassBlur('xl');
      setThemeGlowIntensity('neon');
      setThemeSprinkles('sparkles');
      setThemeCardCustomizations({
        season_hero: { badgeEmoji: '🌌', badgePosition: 'top-right', sprinkles: 'sparkles', glowIntensity: 'neon' },
        learning_track: { badgeEmoji: '🚀', badgePosition: 'top-right' },
        performance: { badgeEmoji: '🪐', badgePosition: 'top-right' },
        avatar_badge: { badgeEmoji: '🛸', badgePosition: 'top-left' }
      });
    }
  };

  const updateSelectedCardCustomization = (key: keyof CardCustomization, val: any) => {
    setThemeCardCustomizations(prev => ({
      ...prev,
      [selectedCardTarget]: {
        ...(prev[selectedCardTarget] || {}),
        [key]: val,
      }
    }));
  };

  // Editing states for Season
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editSeasonOpen, setEditSeasonOpen] = useState(false);
  const [editSeasonTitle, setEditSeasonTitle] = useState('');
  const [editSeasonDescription, setEditSeasonDescription] = useState('');
  const [editSeasonStartDate, setEditSeasonStartDate] = useState('');
  const [editSeasonEndDate, setEditSeasonEndDate] = useState('');
  const [editSeasonCap, setEditSeasonCap] = useState(80);
  const [editSeasonColor, setEditSeasonColor] = useState('#22c55e');

  // Editing states for Reward
  const [editingReward, setEditingReward] = useState<SeasonReward | null>(null);
  const [editRewardOpen, setEditRewardOpen] = useState(false);
  const [editRewardSeasonId, setEditRewardSeasonId] = useState('season_1');
  const [editRewardLevel, setEditRewardLevel] = useState(10);
  const [editRewardTitle, setEditRewardTitle] = useState('');
  const [editRewardDescription, setEditRewardDescription] = useState('');
  const [editRewardType, setEditRewardType] = useState<RewardType>('pet');
  const [editRewardRarity, setEditRewardRarity] = useState<RewardRarity>('Rare');
  const [editRewardIcon, setEditRewardIcon] = useState('🐸');
  const [editRewardPetQuote, setEditRewardPetQuote] = useState('');
  const [editRewardAnimationType, setEditRewardAnimationType] = useState<'bounce' | 'crawl' | 'sleep' | 'flutter' | 'fire' | 'none'>('bounce');
  const [editRewardThemeClass, setEditRewardThemeClass] = useState('theme_test_forest');

  // Editing states for Reward Requirements (Stage 2)
  const [editRewardRequirementType, setEditRewardRequirementType] = useState<'level' | 'checkin' | 'tests' | 'courses'>('level');
  const [editRewardRequirementValue, setEditRewardRequirementValue] = useState<number>(10);
  const [editRewardRequireLevel, setEditRewardRequireLevel] = useState<boolean>(true);

  // Search & Category states for emoji picker panels
  const [rewardEmojiSearch, setRewardEmojiSearch] = useState('');
  const [rewardEmojiCategory, setRewardEmojiCategory] = useState<'all' | 'avatar' | 'theme' | 'badge'>('all');
  const [editRewardEmojiSearch, setEditRewardEmojiSearch] = useState('');
  const [editRewardEmojiCategory, setEditRewardEmojiCategory] = useState<'all' | 'avatar' | 'theme' | 'badge'>('all');

  // Load and sync from Firestore
  useEffect(() => {
    if (!firestore) {
      setSeasons(getStoredSeasons());
      setRewards(getStoredRewards());
      setLibraryThemes(PRESET_THEME_ASSETS);
      return;
    }

    const loadCloudData = async () => {
      try {
        // 1. Seasons
        const seasonsSnap = await getDocs(collection(firestore, 'seasons'));
        let loadedSeasons: Season[] = [];
        seasonsSnap.forEach((d) => {
          loadedSeasons.push({ id: d.id, ...d.data() } as Season);
        });

        if (loadedSeasons.length === 0) {
          const localS = getStoredSeasons();
          const toSeed = localS.length > 0 ? localS : DEFAULT_SEASONS;
          for (const s of toSeed) {
            await setDoc(doc(firestore, 'seasons', s.id), s);
          }
          loadedSeasons = toSeed;
        }
        loadedSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        setSeasons(loadedSeasons);
        saveStoredSeasons(loadedSeasons);

        // Set default season ID for select dropdown
        if (loadedSeasons.length > 0) {
          setRewardSeasonId(loadedSeasons[0].id);
        }

        // 2. Rewards
        const rewardsSnap = await getDocs(collection(firestore, 'rewards'));
        let loadedRewards: SeasonReward[] = [];
        rewardsSnap.forEach((d) => {
          loadedRewards.push({ id: d.id, ...d.data() } as SeasonReward);
        });

        if (loadedRewards.length === 0) {
          const localR = getStoredRewards();
          const toSeed = localR.length > 0 ? localR : DEFAULT_REWARDS;
          for (const r of toSeed) {
            await setDoc(doc(firestore, 'rewards', r.id), r);
          }
          loadedRewards = toSeed;
        }
        setRewards(loadedRewards);
        saveStoredRewards(loadedRewards);

        // 3. Custom Themes Library
        const themesSnap = await getDocs(collection(firestore, 'library_themes'));
        let loadedThemes: AppThemeAsset[] = [];
        const OLD_HARDCODED_THEME_IDS = [
          'theme_ramadan_emerald',
          'theme_halloween_obsidian',
          'theme_christmas_slate',
          'theme_cyberpunk_neon',
          'theme_ramadan_night',
          'theme_winter_frost'
        ];
        themesSnap.forEach((d) => {
          if (!OLD_HARDCODED_THEME_IDS.includes(d.id)) {
            loadedThemes.push({ id: d.id, ...d.data() } as AppThemeAsset);
          } else if (firestore) {
            deleteDoc(doc(firestore, 'library_themes', d.id)).catch(() => {});
          }
        });

        setLibraryThemes(loadedThemes);
      } catch (err) {
        console.error("Firestore sync error in admin panel:", err);
        setSeasons(getStoredSeasons());
        setRewards(getStoredRewards());
        setLibraryThemes([]);
      }
    };

    loadCloudData();

    if (typeof window !== 'undefined') {
      const currentActive = localStorage.getItem(LOCAL_ACTIVE_THEME_KEY) || 'default';
      const OLD_IDS = ['theme_ramadan_emerald', 'theme_halloween_obsidian', 'theme_christmas_slate', 'theme_cyberpunk_neon'];
      if (OLD_IDS.includes(currentActive) || currentActive.startsWith('theme-ramadan') || currentActive.startsWith('theme-halloween') || currentActive.startsWith('theme-christmas') || currentActive.startsWith('theme-cyberpunk')) {
        localStorage.removeItem(LOCAL_ACTIVE_THEME_KEY);
        setActiveTheme('default');
      } else {
        setActiveTheme(currentActive);
      }
    }
  }, [firestore]);

  // Auto-generate CSS class from Title
  useEffect(() => {
    if (themeTitleInput) {
      const slug = 'theme_' + themeTitleInput.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setThemeClassInput(slug);
    }
  }, [themeTitleInput]);

  // Launch / Create New Season
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonTitle) {
      toast({ variant: 'destructive', title: 'Missing Title', description: 'Please enter a season title.' });
      return;
    }

    const nextNumber = seasons.length + 1;
    const newSeason: Season = {
      id: `season_${nextNumber}_${Date.now()}`,
      seasonNumber: nextNumber,
      title: seasonTitle,
      description: seasonDescription || `Academic Season ${nextNumber}`,
      startDate: seasonStartDate,
      endDate: seasonEndDate,
      status: seasons.length === 0 ? 'active' : 'upcoming',
      maxLevelCap: seasonCap || nextNumber * 80,
      themeColor: seasonColor || '#22c55e',
      bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200',
      createdAt: new Date().toISOString(),
    };

    const updated = [...seasons, newSeason];
    setSeasons(updated);
    saveStoredSeasons(updated);

    if (firestore) {
      try {
        await setDoc(doc(firestore, 'seasons', newSeason.id), newSeason);
      } catch (err) {
        console.error("Failed to write season to Firestore:", err);
      }
    }

    toast({
      title: '🎉 Season Published!',
      description: `${seasonTitle} has been added to your academic seasons list.`,
    });

    setSeasonTitle('');
    setSeasonDescription('');
    setNewSeasonOpen(false);
  };

  // One-Click Activate Season
  const handleActivateSeason = async (seasonId: string) => {
    const updated = seasons.map((s) => ({
      ...s,
      status: (s.id === seasonId ? 'active' : 'ended') as Season['status'],
    }));
    setSeasons(updated);
    saveStoredSeasons(updated);

    if (firestore) {
      try {
        for (const s of updated) {
          await setDoc(doc(firestore, 'seasons', s.id), s);
        }
      } catch (err) {
        console.error("Failed to update active season on Firestore:", err);
      }
    }

    toast({
      title: '⚡ Active Season Switched!',
      description: 'The active term has been changed. Student level caps will automatically update without resetting their lifetime XP.',
    });
  };

  // Delete Season
  const handleDeleteSeason = async (seasonId: string) => {
    const updated = seasons.filter((s) => s.id !== seasonId);
    setSeasons(updated);
    saveStoredSeasons(updated);

    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'seasons', seasonId));
      } catch (err) {
        console.error("Failed to delete season from Firestore:", err);
      }
    }
    toast({ title: 'Season Removed' });
  };

  // Add Custom Reward
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle || !rewardLevel) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Title and level are required.' });
      return;
    }

    const targetSeason = seasons.find((s) => s.id === rewardSeasonId) || seasons[0];

    const newReward: SeasonReward = {
      id: `rew_${Date.now()}`,
      seasonId: rewardSeasonId,
      seasonNumber: targetSeason?.seasonNumber || 1,
      requiredLevel: Number(rewardLevel),
      title: rewardTitle,
      description: rewardDescription,
      type: rewardType,
      rarity: rewardRarity,
      iconOrAssetUrl: rewardIcon || '🏆',
      requirementType: rewardRequireLevel ? 'level' : rewardRequirementType,
      requirementValue: rewardRequireLevel ? Number(rewardLevel) : Number(rewardRequirementValue),
      createdAt: new Date().toISOString(),
    };

    if (rewardType === 'pet') {
      if (rewardPetQuote) {
        newReward.petQuote = rewardPetQuote;
      } else {
        delete newReward.petQuote;
      }
      newReward.animationType = rewardAnimationType;
    } else {
      delete newReward.petQuote;
      delete newReward.animationType;
    }

    if (rewardType === 'theme' && rewardThemeClass) {
      newReward.themeClass = rewardThemeClass;
    } else {
      delete newReward.themeClass;
    }

    const updated = [...rewards, newReward];
    setRewards(updated);
    saveStoredRewards(updated);

    if (firestore) {
      try {
        await setDoc(doc(firestore, 'rewards', newReward.id), newReward);
      } catch (err) {
        console.error("Failed to write reward to Firestore:", err);
      }
    }

    toast({
      title: '🎁 Milestone Reward Added!',
      description: `${rewardTitle} attached to Level ${rewardLevel} for ${targetSeason?.title || 'active season'}.`,
    });

    setRewardTitle('');
    setRewardDescription('');
    setRewardPetQuote('');
    setNewRewardOpen(false);
  };

  // Delete Reward
  const handleDeleteReward = async (rewardId: string) => {
    const updated = rewards.filter((r) => r.id !== rewardId);
    setRewards(updated);
    saveStoredRewards(updated);

    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'rewards', rewardId));
      } catch (err) {
        console.error("Failed to delete reward from Firestore:", err);
      }
    }
    toast({ title: 'Reward Milestone Removed' });
  };

  // Delete Theme from Library
  const handleDeleteTheme = async (themeId: string) => {
    const updated = libraryThemes.filter((t) => t.id !== themeId);
    setLibraryThemes(updated);

    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'library_themes', themeId));
      } catch (err) {
        console.error("Failed to delete custom theme from library:", err);
      }
    }
    toast({ title: 'Custom Theme Removed' });
  };

  // Create Custom Theme Presets
  const handleCreateCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeTitleInput || !themeClassInput) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Title and class are required.' });
      return;
    }

    const calculatedPreviewBg = themeBgType === 'solid'
      ? themeBgStartColor
      : themeBgType === 'cyber'
      ? 'linear-gradient(180deg, #020204 0%, #08080f 50%, #020204 100%)'
      : `linear-gradient(${themeGradientAngle}deg, ${themeBgStartColor}, ${themeBgEndColor})`;

    const newTheme: AppThemeAsset = {
      id: `theme_${Date.now()}`,
      title: themeTitleInput,
      description: themeDescInput || `${themeTitleInput} theme preset`,
      category: themeCategoryInput === 'special' ? 'event' : 'milestone',
      previewBg: calculatedPreviewBg,
      themeClass: themeClassInput,
      accentColor: themeAccentInput || '#22c55e',
      iconName: themeCategoryInput === 'special' ? 'Moon' : 'Zap',

      // Extra custom visual variables
      bgType: themeBgType,
      bgStartColor: themeBgStartColor,
      bgEndColor: themeBgEndColor,
      gradientAngle: themeGradientAngle,
      cardBgColor: themeCardBgColor,
      borderColor: themeBorderColor,
      textColor: themeTextColor,
      glowIntensity: themeGlowIntensity,
      gridPattern: themeGridPattern,
      fontFamily: themeFontFamily,
      glassBlur: themeGlassBlur,
      sprinkles: themeSprinkles,
      cardCustomizations: themeCardCustomizations,
    };

    const updated = [...libraryThemes, newTheme];
    setLibraryThemes(updated);

    if (firestore) {
      try {
        await setDoc(doc(firestore, 'library_themes', newTheme.id), newTheme);
      } catch (err) {
        console.error("Failed to write custom theme to library_themes:", err);
      }
    }

    if (themeCategoryInput === 'special' && themeAutoActivateGlobal) {
      setActiveTheme(themeClassInput);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_ACTIVE_THEME_KEY, themeClassInput);
      }
    }

    toast({
      title: '🎨 Custom Theme Created!',
      description: themeCategoryInput === 'special' && themeAutoActivateGlobal
        ? `${themeTitleInput} published & activated as Global Live Theme!`
        : `${themeTitleInput} has been published directly into your Asset Library!`,
    });

    setThemeTitleInput('');
    setThemeDescInput('');
    setThemeClassInput('');
    setThemeCardCustomizations({});
    setThemeSprinkles('none');
    setThemeAutoActivateGlobal(false);
    setNewThemeOpen(false);
  };

  // Toggle Global Special Event Theme
  const handleToggleGlobalTheme = (themeClass: string, themeTitle: string) => {
    const newTheme = activeTheme === themeClass ? 'default' : themeClass;
    setActiveTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_ACTIVE_THEME_KEY, newTheme);
    }

    toast({
      title: newTheme === 'default' ? 'Reset to Standard Theme' : `🎨 Live Global Theme Activated!`,
      description: newTheme === 'default' ? 'App styling restored to standard obsidian.' : `All student and teacher views will reflect ${themeTitle}.`,
    });
  };

  // Season edit triggers
  const handleStartEditSeason = (season: Season) => {
    setEditingSeason(season);
    setEditSeasonTitle(season.title);
    setEditSeasonDescription(season.description || '');
    setEditSeasonStartDate(season.startDate);
    setEditSeasonEndDate(season.endDate);
    setEditSeasonCap(season.maxLevelCap);
    setEditSeasonColor(season.themeColor || '#22c55e');
    setEditSeasonOpen(true);
  };

  const handleUpdateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeason) return;

    const updatedSeason: Season = {
      ...editingSeason,
      title: editSeasonTitle,
      description: editSeasonDescription,
      startDate: editSeasonStartDate,
      endDate: editSeasonEndDate,
      maxLevelCap: editSeasonCap,
      themeColor: editSeasonColor,
      updatedAt: new Date().toISOString(),
    };

    const updated = seasons.map((s) => (s.id === editingSeason.id ? updatedSeason : s));
    setSeasons(updated);
    saveStoredSeasons(updated);

    if (firestore) {
      try {
        await setDoc(doc(firestore, 'seasons', editingSeason.id), updatedSeason);
      } catch (err) {
        console.error("Failed to update season in Firestore:", err);
      }
    }

    toast({ title: '🎉 Season Updated!', description: `${editSeasonTitle} properties have been updated.` });
    setEditSeasonOpen(false);
    setEditingSeason(null);
  };

  // Reward edit triggers
  const handleStartEditReward = (reward: SeasonReward) => {
    setEditingReward(reward);
    setEditRewardSeasonId(reward.seasonId);
    setEditRewardLevel(reward.requiredLevel);
    setEditRewardTitle(reward.title);
    setEditRewardDescription(reward.description || '');
    setEditRewardType(reward.type);
    setEditRewardRarity(reward.rarity);
    setEditRewardIcon(reward.iconOrAssetUrl);
    setEditRewardPetQuote(reward.petQuote || '');
    setEditRewardAnimationType(reward.animationType || 'bounce');
    setEditRewardThemeClass(reward.themeClass || '');
    const reqType = reward.requirementType || 'level';
    setEditRewardRequirementType(reqType === 'level' ? 'checkin' : reqType);
    setEditRewardRequirementValue(reward.requirementValue !== undefined ? reward.requirementValue : reward.requiredLevel);
    setEditRewardRequireLevel(reqType === 'level');
    setEditRewardOpen(true);
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;

    const targetSeason = seasons.find((s) => s.id === editRewardSeasonId);

    const updatedReward: SeasonReward = {
      ...editingReward,
      seasonId: editRewardSeasonId,
      seasonNumber: targetSeason?.seasonNumber || editingReward.seasonNumber,
      requiredLevel: Number(editRewardLevel),
      title: editRewardTitle,
      description: editRewardDescription,
      type: editRewardType,
      rarity: editRewardRarity,
      iconOrAssetUrl: editRewardIcon,
      requirementType: editRewardRequireLevel ? 'level' : editRewardRequirementType,
      requirementValue: editRewardRequireLevel ? Number(editRewardLevel) : Number(editRewardRequirementValue),
    };

    if (editRewardType === 'pet') {
      if (editRewardPetQuote) {
        updatedReward.petQuote = editRewardPetQuote;
      } else {
        delete updatedReward.petQuote;
      }
      updatedReward.animationType = editRewardAnimationType;
    } else {
      delete updatedReward.petQuote;
      delete updatedReward.animationType;
    }

    if (editRewardType === 'theme' && editRewardThemeClass) {
      updatedReward.themeClass = editRewardThemeClass;
    } else {
      delete updatedReward.themeClass;
    }

    const updated = rewards.map((r) => (r.id === editingReward.id ? updatedReward : r));
    setRewards(updated);
    saveStoredRewards(updated);

    if (firestore) {
      try {
        await setDoc(doc(firestore, 'rewards', editingReward.id), updatedReward);
      } catch (err) {
        console.error("Failed to update reward in Firestore:", err);
      }
    }

    toast({ title: '🎁 Reward Updated!', description: `${editRewardTitle} properties have been updated.` });
    setEditRewardOpen(false);
    setEditingReward(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-zinc-100">
      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#131316] p-6 rounded-2xl border border-zinc-800 shadow-xl glass-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
            <Palette className="h-4 w-4 text-purple-400" />
            THEME MAKER & BRANDING STUDIO
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Theme Maker & Custom Assets Library
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Design and create custom themes for professors and students. Assign created themes to specific professors to automatically apply their custom branding and palette upon connection.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setNewThemeOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-lg shadow-purple-600/20"
          >
            <Plus className="h-4 w-4" />
            Create Custom Theme
          </Button>
        </div>
      </div>

      {/* SECTION 3: COMPLEX THEME & CUSTOM ASSETS LIBRARY */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-extrabold text-white">Complex Theme & Custom Assets Library</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setNewThemeOpen(true)}
              size="sm"
              variant="outline"
              className="border-purple-800 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40 text-xs gap-1.5 h-8 font-mono font-bold"
            >
              <Plus className="h-3.5 w-3.5 text-purple-300" />
              Create Custom Theme
            </Button>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30 font-mono">
              ADMIN ASSET SUITE
            </Badge>
          </div>
        </div>

        {/* Library Sub-Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveLibraryTab('special')}
            className={cn(
              "text-xs font-mono font-black uppercase px-4 py-1.5 rounded-lg border transition-all",
              activeLibraryTab === 'special'
                ? "bg-purple-500 text-black border-purple-500"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            🌙 Special Event Themes
          </button>
          <button
            onClick={() => setActiveLibraryTab('regular')}
            className={cn(
              "text-xs font-mono font-black uppercase px-4 py-1.5 rounded-lg border transition-all",
              activeLibraryTab === 'regular'
                ? "bg-purple-500 text-black border-purple-500"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            🎨 Regular Milestone Themes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {libraryThemes.filter((t) => (activeLibraryTab === 'special' ? (t.category === 'event' || t.category === 'seasonal') : t.category === 'milestone')).length === 0 ? (
            <div className="col-span-full bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Palette className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-white mb-1">
                  {activeLibraryTab === 'special' ? 'No Special Event Themes Created Yet' : 'No Regular Milestone Themes Created Yet'}
                </h4>
                <p className="text-xs text-zinc-400">
                  Use the <strong className="text-purple-300 font-mono">Create Custom Theme</strong> button above to design full-featured themes with custom colors, glows, floating emojis, and particle sprinkles using the live visual simulator.
                </p>
              </div>
              <Button
                onClick={() => {
                  setThemeCategoryInput(activeLibraryTab === 'special' ? 'special' : 'regular');
                  setNewThemeOpen(true);
                }}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold mt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create First {activeLibraryTab === 'special' ? 'Special Event' : 'Milestone'} Theme
              </Button>
            </div>
          ) : (
            libraryThemes
              .filter((t) => (activeLibraryTab === 'special' ? (t.category === 'event' || t.category === 'seasonal') : t.category === 'milestone'))
              .map((asset) => {
                const isLiveGlobal = activeTheme === asset.themeClass;

                return (
                  <Card
                    key={asset.id}
                    className={cn(
                      "bg-[#131316] border transition-all overflow-hidden flex flex-col justify-between",
                      isLiveGlobal ? "border-amber-500 shadow-xl shadow-amber-500/10" : "border-zinc-800"
                    )}
                  >
                    <div>
                      {/* Theme Preview Header Box */}
                      <div
                        className="h-28 p-4 flex flex-col justify-between border-b border-zinc-800 relative group/preview"
                        style={{ background: asset.previewBg }}
                      >
                        <div className="flex items-center justify-between">
                          <Badge className="bg-black/60 text-white border-white/20 text-[10px] backdrop-blur-md">
                            {asset.category === 'event' || asset.category === 'seasonal' ? 'EVENT PASS' : 'REGULAR'}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {isLiveGlobal && (
                              <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded-full font-mono uppercase">
                                LIVE
                              </span>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTheme(asset.id)}
                              className="h-5 w-5 bg-black/60 text-zinc-400 hover:text-red-400 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-base font-extrabold text-white drop-shadow-md">
                          {asset.title}
                        </div>
                      </div>

                      <CardContent className="pt-4 space-y-2">
                        <p className="text-xs text-zinc-400">
                          {asset.description}
                        </p>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Class: <strong className="text-zinc-300">{asset.themeClass}</strong>
                        </div>
                      </CardContent>
                    </div>

                    <div className="p-4 pt-0 space-y-2">
                      {asset.category === 'milestone' ? (
                        <div className="w-full text-center py-2 px-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                          🔒 Milestone Reward Only
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleToggleGlobalTheme(asset.themeClass, asset.title)}
                          className={cn(
                            "w-full text-xs font-bold gap-1.5 h-8",
                            isLiveGlobal
                              ? "bg-amber-500 text-black hover:bg-amber-600"
                              : "bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                          )}
                        >
                          {isLiveGlobal ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Live Theme Active
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5 text-amber-400" />
                              Toggle Global Live Theme
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
          )}
        </div>

        {/* AI Prompt Integration Note for Admin */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-bold block mb-0.5">Prompt Integration Library Note:</strong>
            Whenever you ask for complex custom visual themes or event passes (e.g. Ramadan, Christmas, Eid, Halloween) directly in our chat, they will automatically be generated and added directly to this Admin Asset Library for your 1-click publishing!
          </div>
        </div>
      </div>

      {/* DIALOG 1: CREATE NEW SEASON */}
      <Dialog open={newSeasonOpen} onOpenChange={setNewSeasonOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <Trophy className="h-5 w-5" /> Launch New Academic Season
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Define academic term dates, title, and maximum seasonal level cap (+80 levels per term).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSeason} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Season Title</Label>
              <Input
                placeholder="e.g. Season 3: Celestial Heights"
                value={seasonTitle}
                onChange={(e) => setSeasonTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Textarea
                placeholder="Academic term highlights and milestone description..."
                value={seasonDescription}
                onChange={(e) => setSeasonDescription(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Start Date</Label>
                <Input
                  type="date"
                  value={seasonStartDate}
                  onChange={(e) => setSeasonStartDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">End Date</Label>
                <Input
                  type="date"
                  value={seasonEndDate}
                  onChange={(e) => setSeasonEndDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Max Seasonal Level Cap</Label>
                <Input
                  type="number"
                  value={seasonCap}
                  onChange={(e) => setSeasonCap(Number(e.target.value))}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Theme Color</Label>
                <Input
                  type="color"
                  value={seasonColor}
                  onChange={(e) => setSeasonColor(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 h-9 p-1 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setNewSeasonOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs">
                Publish Season
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: CREATE NEW MILESTONE REWARD */}
      <Dialog open={newRewardOpen} onOpenChange={setNewRewardOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-400">
              <Gift className="h-5 w-5" /> Add Level Milestone Reward
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Attach pets, themes, avatars, or badges to specific student level milestones.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReward} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Target Season</Label>
                <Select value={rewardSeasonId} onValueChange={setRewardSeasonId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        Season {s.seasonNumber} ({s.title})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Milestone Grid Order (Position)</Label>
                <Input
                  type="number"
                  value={rewardLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRewardLevel(val);
                  }}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            {/* Unlocking Requirement Toggle Setting */}
            <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-500 block">🏆 Unlock Requirement</span>
                  <span className="text-[10px] text-zinc-400 block">Require a specific student level to unlock?</span>
                </div>
                <Switch 
                  checked={rewardRequireLevel}
                  onCheckedChange={(val) => {
                    setRewardRequireLevel(val);
                  }}
                />
              </div>

              {rewardRequireLevel ? (
                <div className="text-xs p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg animate-in fade-in duration-200">
                  ⭐ Student must reach <strong>Level {rewardLevel}</strong> to unlock this reward.
                </div>
              ) : (
                <div className="space-y-3 pt-1 border-t border-zinc-800/60 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Alternative Unlock Type</Label>
                    <Select 
                      value={rewardRequirementType === 'level' ? 'checkin' : rewardRequirementType} 
                      onValueChange={(val: any) => {
                        setRewardRequirementType(val);
                      }}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="checkin" className="text-xs">🔥 Daily App Check-ins count</SelectItem>
                        <SelectItem value="tests" className="text-xs">📝 Tests Completed count</SelectItem>
                        <SelectItem value="courses" className="text-xs">📺 Courses Watched count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Target Count</Label>
                    <Input
                      type="number"
                      value={rewardRequirementValue}
                      onChange={(e) => setRewardRequirementValue(Number(e.target.value))}
                      className="bg-zinc-900 border-zinc-800 text-xs font-mono h-8"
                      placeholder="Enter target count (e.g. 15)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Reward Title</Label>
              <Input
                placeholder="e.g. Kero the Frog Companion"
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Textarea
                placeholder="What does this unlock for the student?"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs h-16"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Type</Label>
                <Select value={rewardType} onValueChange={(v) => {
                  const val = v as RewardType;
                  setRewardType(val);
                  // Default icons depending on type
                  if (val === 'pet') setRewardIcon('🐸');
                  else if (val === 'theme') setRewardIcon('🌌');
                  else if (val === 'avatar') setRewardIcon('👦');
                  else setRewardIcon('🌱');
                }}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="pet" className="text-xs">🐾 Pet</SelectItem>
                    <SelectItem value="theme" className="text-xs">🎨 Theme</SelectItem>
                    <SelectItem value="avatar" className="text-xs">👤 Avatar</SelectItem>
                    <SelectItem value="badge" className="text-xs">🏆 Badge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Rarity</Label>
                <Select value={rewardRarity} onValueChange={(v) => setRewardRarity(v as RewardRarity)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Common" className="text-xs">Common</SelectItem>
                    <SelectItem value="Rare" className="text-xs">Rare</SelectItem>
                    <SelectItem value="Epic" className="text-xs">Epic</SelectItem>
                    <SelectItem value="Legendary" className="text-xs">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Emoji / Icon</Label>
                <Input
                  placeholder="🐸"
                  value={rewardIcon}
                  onChange={(e) => setRewardIcon(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs text-center text-lg font-bold"
                />
              </div>
            </div>

            {/* Quick Preset Picker Panel */}
            <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-300">Quick Icon Picker Panel</Label>
                {rewardType !== 'pet' && (
                  <span className="text-[10px] text-zinc-500">Select any category below</span>
                )}
              </div>

              {rewardType === 'pet' ? (
                <div className="text-[10px] text-emerald-400 font-bold mb-1">🐾 Showing cute companion pets (No duplicates)</div>
              ) : (
                <div className="space-y-2">
                  {/* Category Tabs for non-pet types */}
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'avatar', 'theme', 'badge'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setRewardEmojiCategory(cat)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer",
                          rewardEmojiCategory === cat
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {cat === 'all' && '✨ All Emojis'}
                        {cat === 'avatar' && '👤 Avatars'}
                        {cat === 'theme' && '🎨 Themes'}
                        {cat === 'badge' && '🏆 Badges'}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <Input
                    placeholder="🔍 Search all emojis..."
                    value={rewardEmojiSearch}
                    onChange={(e) => setRewardEmojiSearch(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-8 text-white"
                  />
                </div>
              )}

              {/* Emoji Grid */}
              <div className="flex flex-wrap gap-1 p-1 bg-zinc-950 max-h-36 overflow-y-auto font-mono rounded border border-zinc-900/50 mt-1">
                {(rewardType === 'pet'
                  ? UNIQUE_EMOJIS.pet
                  : (() => {
                      let baseList: string[] = [];
                      if (rewardEmojiCategory === 'all') {
                        baseList = Array.from(new Set([...UNIQUE_EMOJIS.avatar, ...UNIQUE_EMOJIS.theme, ...UNIQUE_EMOJIS.badge]));
                      } else {
                        baseList = UNIQUE_EMOJIS[rewardEmojiCategory];
                      }
                      
                      if (rewardEmojiSearch) {
                        const searchLower = rewardEmojiSearch.toLowerCase();
                        return baseList.filter(emoji => {
                          const keywords = EMOJI_NAMES[emoji] || '';
                          return keywords.toLowerCase().includes(searchLower);
                        });
                      }
                      return baseList;
                    })()
                ).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setRewardIcon(emoji)}
                    className={cn(
                      "w-7 h-7 rounded text-sm hover:bg-zinc-800 transition-all flex items-center justify-center shrink-0 cursor-pointer",
                      rewardIcon === emoji ? "bg-amber-500/20 border border-amber-500 text-white font-bold" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {rewardType === 'pet' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">QR Code Animation style</Label>
                  <Select value={rewardAnimationType} onValueChange={(v) => setRewardAnimationType(v as any)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="bounce" className="text-xs">🐸 Jumps up & down (bounce)</SelectItem>
                      <SelectItem value="crawl" className="text-xs">🐌 Crawls across the bottom (crawl)</SelectItem>
                      <SelectItem value="sleep" className="text-xs">🐱 Sleeps peacefully at the top (sleep)</SelectItem>
                      <SelectItem value="flutter" className="text-xs">🐦 Flutters wings & hovers (flutter)</SelectItem>
                      <SelectItem value="fire" className="text-xs">🐉 Breathes fire on bottom right (fire)</SelectItem>
                      <SelectItem value="none" className="text-xs">🐾 Sits quietly (no animation)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Pet Motivational Speech Quote</Label>
                  <Input
                    placeholder="e.g. Ribbit! Focus and make a big leap forward today!"
                    value={rewardPetQuote}
                    onChange={(e) => setRewardPetQuote(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
              </>
            )}

            {rewardType === 'theme' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Linked Theme Class</Label>
                <Select value={rewardThemeClass} onValueChange={setRewardThemeClass}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue placeholder="Select from Custom Theme Library" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {libraryThemes.filter((theme) => theme.category !== 'event').map((theme) => (
                      <SelectItem key={theme.id} value={theme.themeClass} className="text-xs">
                        {theme.title} ({theme.themeClass})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setNewRewardOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs">
                Add Milestone Reward
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: CREATE CUSTOM THEME */}
      <Dialog open={newThemeOpen} onOpenChange={setNewThemeOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-400 font-mono">
                <Palette className="h-5 w-5" /> 🎨 Theme Studio & Visual Profile Simulator
              </DialogTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-amber-400 font-mono uppercase mr-1">Load Preset:</span>
                <button
                  type="button"
                  onClick={() => loadThemePreset('ramadan')}
                  className="text-[10px] font-mono px-2 py-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded-lg transition-all"
                >
                  🌙 Ramadan
                </button>
                <button
                  type="button"
                  onClick={() => loadThemePreset('cyberpunk')}
                  className="text-[10px] font-mono px-2 py-1 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 rounded-lg transition-all"
                >
                  ⚡ Cyberpunk
                </button>
                <button
                  type="button"
                  onClick={() => loadThemePreset('halloween')}
                  className="text-[10px] font-mono px-2 py-1 bg-orange-950/50 hover:bg-orange-900/60 text-orange-300 border border-orange-800/60 rounded-lg transition-all"
                >
                  🎃 Halloween
                </button>
                <button
                  type="button"
                  onClick={() => loadThemePreset('winter')}
                  className="text-[10px] font-mono px-2 py-1 bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 rounded-lg transition-all"
                >
                  ❄️ Winter
                </button>
                <button
                  type="button"
                  onClick={() => loadThemePreset('desert')}
                  className="text-[10px] font-mono px-2 py-1 bg-yellow-950/50 hover:bg-yellow-900/60 text-yellow-300 border border-yellow-800/60 rounded-lg transition-all"
                >
                  🏜️ Desert
                </button>
                <button
                  type="button"
                  onClick={() => loadThemePreset('cosmic')}
                  className="text-[10px] font-mono px-2 py-1 bg-fuchsia-950/50 hover:bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-800/60 rounded-lg transition-all"
                >
                  🌌 Cosmic
                </button>
              </div>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              Customize global palettes or tweak individual profile cards with custom colors, neon glows, floating badge emojis, and animated particle sprinkles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomTheme} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Controls & Tweak Tabs */}
              <div className="lg:col-span-5 space-y-4 max-h-[68vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {/* Mode Selector Tabs */}
                <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBuilderTab('global')}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-bold font-mono rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-1.5",
                      builderTab === 'global' ? "bg-purple-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Palette className="w-3.5 h-3.5" /> Canvas & Palette
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderTab('cards')}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-bold font-mono rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-1.5",
                      builderTab === 'cards' ? "bg-purple-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" /> Card Tweaks
                  </button>
                </div>

                {builderTab === 'global' ? (
                  <div className="space-y-3.5">
                    {/* Theme Category Classification */}
                    <div className="space-y-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                      <Label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider block">
                        🏷️ Theme Classification / Save Category
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setThemeCategoryInput('special')}
                          className={cn(
                            "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all",
                            themeCategoryInput === 'special'
                              ? "bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500"
                              : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1">
                              🌙 Special Event Theme
                            </span>
                            {themeCategoryInput === 'special' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-snug">
                            Seasonal pass, event overrides, or global holiday themes.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setThemeCategoryInput('regular');
                            setThemeAutoActivateGlobal(false);
                          }}
                          className={cn(
                            "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all",
                            themeCategoryInput === 'regular'
                              ? "bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500"
                              : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1">
                              🎨 Regular Milestone Theme
                            </span>
                            {themeCategoryInput === 'regular' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-snug">
                            Unlockable milestone reward theme equipped per-student.
                          </p>
                        </button>
                      </div>

                      {/* Global Live Theme Toggle if Special Event Theme is chosen */}
                      {themeCategoryInput === 'special' && (
                        <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between gap-3 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                          <div>
                            <span className="text-xs font-bold text-amber-300 block flex items-center gap-1.5 font-mono">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              Activate as Global Live Theme
                            </span>
                            <span className="text-[10px] text-zinc-400 leading-tight block">
                              Automatically overrides all scholar profiles across the application upon publishing.
                            </span>
                          </div>
                          <Switch
                            checked={themeAutoActivateGlobal}
                            onCheckedChange={setThemeAutoActivateGlobal}
                            className="data-[state=checked]:bg-amber-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-300">Theme Title</Label>
                        <Input
                          placeholder="e.g. Desert Amber"
                          value={themeTitleInput}
                          onChange={(e) => {
                            setThemeTitleInput(e.target.value);
                            if (!themeClassInput || themeClassInput === `theme_${themeTitleInput.toLowerCase().replace(/[^a-z0-9]/g, '_')}`) {
                              setThemeClassInput(`theme_${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
                            }
                          }}
                          className="bg-zinc-950 border-zinc-800 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-300">CSS Class Code</Label>
                        <Input
                          placeholder="e.g. theme_desert_amber"
                          value={themeClassInput}
                          onChange={(e) => setThemeClassInput(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Description</Label>
                      <Textarea
                        placeholder="Theme atmosphere and highlights..."
                        value={themeDescInput}
                        onChange={(e) => setThemeDescInput(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs h-10 min-h-[40px]"
                      />
                    </div>

                    <div className="border-t border-zinc-800 pt-3 space-y-3">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block font-mono">GLOBAL CANVAS & PALETTE</span>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Canvas Background</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeBgStartColor}
                              onChange={(e) => setThemeBgStartColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 w-8 h-8 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              value={themeBgStartColor}
                              onChange={(e) => setThemeBgStartColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Default Card Bg</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeCardBgColor}
                              onChange={(e) => setThemeCardBgColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 w-8 h-8 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              value={themeCardBgColor}
                              onChange={(e) => setThemeCardBgColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Text & Ink Color</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeTextColor}
                              onChange={(e) => setThemeTextColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 w-8 h-8 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              value={themeTextColor}
                              onChange={(e) => setThemeTextColor(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Brand Accent Color</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeAccentInput}
                              onChange={(e) => setThemeAccentInput(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 w-8 h-8 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              value={themeAccentInput}
                              onChange={(e) => setThemeAccentInput(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-3 space-y-3">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block font-mono">TYPOGRAPHY & ATMOSPHERE</span>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Font Family</Label>
                          <Select value={themeFontFamily} onValueChange={(v) => setThemeFontFamily(v as any)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="sans" className="text-xs">Clean Sans (Inter)</SelectItem>
                              <SelectItem value="space" className="text-xs">Geometric (Space)</SelectItem>
                              <SelectItem value="mono" className="text-xs">Technical (Monospace)</SelectItem>
                              <SelectItem value="serif" className="text-xs">Premium (Serif)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Background Grid</Label>
                          <Select value={themeGridPattern} onValueChange={(v) => setThemeGridPattern(v as any)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="none" className="text-xs">None (Solid)</SelectItem>
                              <SelectItem value="dots" className="text-xs">Technical Dots</SelectItem>
                              <SelectItem value="lines" className="text-xs">Grid Lines</SelectItem>
                              <SelectItem value="stars" className="text-xs">Star Dust</SelectItem>
                              <SelectItem value="cyber" className="text-xs">Cyber Matrix</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Neon Aura Glow</Label>
                          <Select value={themeGlowIntensity} onValueChange={(v) => setThemeGlowIntensity(v as any)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              <SelectItem value="subtle" className="text-xs">Ambient Subtle</SelectItem>
                              <SelectItem value="vivid" className="text-xs">Vivid Aura</SelectItem>
                              <SelectItem value="neon" className="text-xs">High Voltage Neon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300">Global Sprinkles</Label>
                          <Select value={themeSprinkles} onValueChange={(v) => setThemeSprinkles(v as any)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              <SelectItem value="sparkles" className="text-xs">✨ Sparkles</SelectItem>
                              <SelectItem value="stars" className="text-xs">⭐ Floating Stars</SelectItem>
                              <SelectItem value="glow" className="text-xs">💫 Shimmer Light</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CARDS TAB: Per-Card Granular Customizer */
                  <div className="space-y-3.5">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                      <Label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                        🎯 Select Card Target
                      </Label>
                      <Select 
                        value={selectedCardTarget} 
                        onValueChange={(v) => setSelectedCardTarget(v as any)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="season_hero">🌟 Header Welcome Banner</SelectItem>
                          <SelectItem value="avatar_badge">👤 Scholar Digital Pass (QR & Code)</SelectItem>
                          <SelectItem value="learning_track">📚 University Lecture Vault (Courses)</SelectItem>
                          <SelectItem value="performance">📈 Assessment & Benchmarks (Exam Results)</SelectItem>
                          <SelectItem value="registry">📜 Academic Dossier (Enrollment Stats)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-zinc-500 italic">
                        Tip: You can also click directly on any card in the simulator preview!
                      </p>
                    </div>

                    {/* Emoji Decoration Picker */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">
                          Floating Badge Emoji
                        </Label>
                        {themeCardCustomizations[selectedCardTarget]?.badgeEmoji && (
                          <button
                            type="button"
                            onClick={() => updateSelectedCardCustomization('badgeEmoji', '')}
                            className="text-[10px] text-red-400 hover:text-red-300 font-mono uppercase underline"
                          >
                            Remove Emoji
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Type or select emoji..."
                          value={themeCardCustomizations[selectedCardTarget]?.badgeEmoji || ''}
                          onChange={(e) => updateSelectedCardCustomization('badgeEmoji', e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-sm font-bold w-28 text-center"
                        />
                        <Input
                          placeholder="Search quick emojis..."
                          value={cardEmojiSearch}
                          onChange={(e) => setCardEmojiSearch(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs flex-grow"
                        />
                      </div>

                      {/* Quick Emoji Selection Grid */}
                      <div className="grid grid-cols-8 gap-1 p-2 bg-zinc-900/60 rounded-lg border border-zinc-800/80 max-h-24 overflow-y-auto">
                        {[
                          '🌙', '🎃', '❄️', '⚡', '👑', '🏆', '🚀', '🔥',
                          '👾', '💎', '🌟', '🌸', '🐸', '🐱', '🎯', '🪐',
                          '🎓', '🛡️', '✨', '⭐', '🌵', '🕌', '🍦', '🔮',
                          '🌴', '🍀', '🦋', '⛄', '🦇', '👻', '☀️', '☕'
                        ]
                        .filter(em => !cardEmojiSearch || em.includes(cardEmojiSearch))
                        .map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => updateSelectedCardCustomization('badgeEmoji', em)}
                            className={cn(
                              "h-7 w-7 rounded flex items-center justify-center text-sm hover:bg-zinc-800 transition-all",
                              themeCardCustomizations[selectedCardTarget]?.badgeEmoji === em ? "bg-purple-600/40 border border-purple-500 scale-110" : ""
                            )}
                          >
                            {em}
                          </button>
                        ))}
                      </div>

                      {/* Emoji Position Selector */}
                      <div className="space-y-1 pt-1">
                        <Label className="text-[11px] text-zinc-400 font-mono">Emoji Placement Corner</Label>
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { id: 'top-left', label: 'Top L' },
                            { id: 'top-center', label: 'Top C' },
                            { id: 'top-right', label: 'Top R' },
                            { id: 'bottom-left', label: 'Btm L' },
                            { id: 'bottom-right', label: 'Btm R' },
                          ].map((pos) => {
                            const currentPos = themeCardCustomizations[selectedCardTarget]?.badgePosition || 'top-right';
                            return (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => updateSelectedCardCustomization('badgePosition', pos.id)}
                                className={cn(
                                  "py-1 text-[10px] font-mono rounded border transition-all font-bold",
                                  currentPos === pos.id 
                                    ? "bg-purple-600 text-white border-purple-500 shadow" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                )}
                              >
                                {pos.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card Sprinkles & Glow */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300 font-mono">Card Sprinkles</Label>
                          <Select 
                            value={themeCardCustomizations[selectedCardTarget]?.sprinkles || 'none'} 
                            onValueChange={(v) => updateSelectedCardCustomization('sprinkles', v)}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              <SelectItem value="sparkles" className="text-xs">✨ Sparkles</SelectItem>
                              <SelectItem value="stars" className="text-xs">⭐ Stars</SelectItem>
                              <SelectItem value="glow" className="text-xs">💫 Shimmer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-300 font-mono">Card Glow Aura</Label>
                          <Select 
                            value={themeCardCustomizations[selectedCardTarget]?.glowIntensity || 'none'} 
                            onValueChange={(v) => updateSelectedCardCustomization('glowIntensity', v)}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="none" className="text-xs">Default</SelectItem>
                              <SelectItem value="subtle" className="text-xs">Subtle</SelectItem>
                              <SelectItem value="vivid" className="text-xs">Vivid</SelectItem>
                              <SelectItem value="neon" className="text-xs">Neon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Card Color Overrides */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-400">Card Background Override</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeCardCustomizations[selectedCardTarget]?.bgColor || themeCardBgColor}
                              onChange={(e) => updateSelectedCardCustomization('bgColor', e.target.value)}
                              className="bg-zinc-900 border-zinc-800 w-7 h-7 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              placeholder="Default"
                              value={themeCardCustomizations[selectedCardTarget]?.bgColor || ''}
                              onChange={(e) => updateSelectedCardCustomization('bgColor', e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-[11px] font-mono h-7 flex-grow"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-400">Card Border Override</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={themeCardCustomizations[selectedCardTarget]?.borderColor || themeBorderColor}
                              onChange={(e) => updateSelectedCardCustomization('borderColor', e.target.value)}
                              className="bg-zinc-900 border-zinc-800 w-7 h-7 p-0.5 cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              placeholder="Default"
                              value={themeCardCustomizations[selectedCardTarget]?.borderColor || ''}
                              onChange={(e) => updateSelectedCardCustomization('borderColor', e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-[11px] font-mono h-7 flex-grow"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Full Scale Visual Model Simulator of Profile Page */}
              <div className="lg:col-span-7 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-purple-400 font-extrabold font-mono bg-purple-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Live Student Profile Visual Simulator
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Click any card to tweak</span>
                  </div>

                  {/* Device & Theme Mode Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setSimulatorThemeMode('dark')}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-mono font-bold rounded flex items-center gap-1 transition-all cursor-pointer",
                          simulatorThemeMode === 'dark'
                            ? "bg-zinc-800 text-white shadow-xs"
                            : "text-zinc-400 hover:text-white"
                        )}
                        title="Preview Dark Mode"
                      >
                        🌙 Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulatorThemeMode('light')}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-mono font-bold rounded flex items-center gap-1 transition-all cursor-pointer",
                          simulatorThemeMode === 'light'
                            ? "bg-amber-500 text-zinc-950 font-black shadow-xs"
                            : "text-zinc-400 hover:text-white"
                        )}
                        title="Preview Light Mode"
                      >
                        ☀️ Light
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setSimulatorDeviceMode('desktop')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-mono font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer",
                          simulatorDeviceMode === 'desktop'
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <Monitor className="w-3.5 h-3.5" /> Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulatorDeviceMode('mobile')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-mono font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer",
                          simulatorDeviceMode === 'mobile'
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <Smartphone className="w-3.5 h-3.5" /> Mobile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scaled Profile Layout Container */}
                <div className={cn(
                  "transition-all duration-300 mx-auto w-full",
                  simulatorDeviceMode === 'mobile' ? "max-w-[380px] p-2 bg-zinc-900/40 rounded-3xl border-2 border-zinc-700 shadow-2xl" : "w-full"
                )}>
                  {/* Mobile Bezel Header if Mobile */}
                  {simulatorDeviceMode === 'mobile' && (
                    <div className="flex items-center justify-between px-3 py-1 mb-2 text-[9px] font-mono text-zinc-500 border-b border-zinc-800">
                      <span>9:41</span>
                      <div className="w-12 h-2.5 bg-zinc-800 rounded-full" />
                      <span>5G 100%</span>
                    </div>
                  )}

                  {/* Theme CSS Wrapper matching exact profile.css */}
                  <div 
                    className="scholar-theme rounded-2xl p-3 sm:p-4 border transition-all text-left relative shadow-2xl overflow-y-auto max-h-[64vh] scrollbar-thin scrollbar-thumb-zinc-800"
                    style={{
                      '--bg': simulatorThemeMode === 'light' ? '#f8fafc' : (themeBgStartColor || '#0b0b0c'),
                      '--ink': simulatorThemeMode === 'light' ? '#0f172a' : (themeTextColor || '#f2f2f2'),
                      '--accent': themeAccentInput || '#ff05bc',
                      '--success': themeAccentInput || '#22c55e',
                      '--warning': '#ffb800',
                      '--card-bg': simulatorThemeMode === 'light' ? '#ffffff' : (themeCardBgColor || 'rgba(255, 255, 255, 0.03)'),
                      '--border': simulatorThemeMode === 'light' ? '#e2e8f0' : (themeBorderColor || 'rgba(255, 255, 255, 0.12)'),
                      '--border-custom': simulatorThemeMode === 'light' ? '#e2e8f0' : (themeBorderColor || 'rgba(255, 255, 255, 0.12)'),
                      '--glow-custom': themeGlowIntensity,
                      '--grid-custom': themeGridPattern,
                      '--font-custom': themeFontFamily,
                      '--blur-custom': themeGlassBlur,
                      '--sprinkles-custom': themeSprinkles,
                      background: simulatorThemeMode === 'light' ? '#f8fafc' : (themeBgType === 'gradient' ? `linear-gradient(${themeGradientAngle}deg, ${themeBgStartColor}, ${themeBgEndColor})` : (themeBgStartColor || '#0b0b0c')),
                      color: simulatorThemeMode === 'light' ? '#0f172a' : (themeTextColor || '#f2f2f2'),
                      borderColor: simulatorThemeMode === 'light' ? '#e2e8f0' : (themeBorderColor || 'rgba(255, 255, 255, 0.12)'),
                      fontFamily: themeFontFamily === 'mono' ? 'Courier New, Courier, monospace' : themeFontFamily === 'space' ? 'system-ui, sans-serif' : themeFontFamily === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif',
                    } as React.CSSProperties}
                  >
                    {/* Grid Overlay Simulator */}
                    {themeGridPattern === 'dots' && (
                      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(${themeTextColor} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
                    )}
                    {themeGridPattern === 'lines' && (
                      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, ${themeTextColor} 1px, transparent 1px), linear-gradient(to bottom, ${themeTextColor} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
                    )}
                    {themeGridPattern === 'cyber' && (
                      <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: `linear-gradient(0deg, transparent 24%, ${themeAccentInput}1a 25%, ${themeAccentInput}1a 26%, transparent 27%, transparent 74%, ${themeAccentInput}1a 75%, ${themeAccentInput}1a 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, ${themeAccentInput}1a 25%, ${themeAccentInput}1a 26%, transparent 27%, transparent 74%, ${themeAccentInput}1a 75%, ${themeAccentInput}1a 76%, transparent 77%, transparent)`, backgroundSize: '32px 32px' }} />
                    )}
                    {themeGridPattern === 'stars' && (
                      <div className="absolute inset-0 pointer-events-none opacity-30 text-center select-none text-[8px] pt-1">✨  *  ✦  ⭐  *  ✦  ✨</div>
                    )}

                    {/* Desktop vs Mobile Layout Container */}
                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Top Welcome Header Banner (replaces season_hero with a layout representing `/profile` welcome banner) */}
                      <div
                        onClick={() => { setSelectedCardTarget('season_hero'); setBuilderTab('cards'); }}
                        className={cn(
                          "p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer",
                          selectedCardTarget === 'season_hero' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                        )}
                        style={{
                          background: themeCardCustomizations.season_hero?.bgColor || themeCardBgColor,
                          borderColor: themeCardCustomizations.season_hero?.borderColor || themeBorderColor,
                          borderWidth: '1.5px',
                          boxShadow: themeCardCustomizations.season_hero?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                        }}
                      >
                        {/* Glowing ambient background blob */}
                        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" style={{ backgroundColor: `${themeAccentInput}1a` }} />

                        {themeCardCustomizations.season_hero?.badgeEmoji && (
                          <div className="absolute top-2 right-2 text-lg select-none drop-shadow animate-bounce">
                            {themeCardCustomizations.season_hero.badgeEmoji}
                          </div>
                        )}

                        <div className="flex items-center gap-3.5 z-10">
                          {/* Profile Avatar Container */}
                          <div className="relative shrink-0">
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-16 rounded-xl overflow-hidden border flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                              style={{ borderColor: themeAccentInput, background: `${themeAccentInput}15` }}
                            >
                              <span className="text-xl sm:text-2xl select-none leading-none">👦</span>
                            </div>
                            <span 
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
                              style={{ background: themeAccentInput, color: '#000' }}
                            >
                              <Edit className="w-2 h-2 text-zinc-950" />
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border" style={{ color: themeAccentInput, borderColor: `${themeAccentInput}30`, backgroundColor: `${themeAccentInput}10` }}>
                                🎓 MOL5SATY // SCHOLAR
                              </span>
                            </div>
                            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                              Alex Rivera
                            </h2>
                            <p className="text-[10px] opacity-80 font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold flex items-center gap-1">
                                Cairo University
                              </span>
                              <span className="opacity-55">•</span>
                              <span className="font-semibold" style={{ color: themeAccentInput }}>
                                Faculty of Medicine
                              </span>
                              <span className="opacity-55">•</span>
                              <span>3rd Year</span>
                            </p>
                          </div>
                        </div>

                        {/* Interactive Themes & Icons simulate button */}
                        <div className="flex items-center gap-2 w-full sm:w-auto z-10 shrink-0">
                          <button
                            type="button"
                            className="w-full sm:w-auto h-7 px-2.5 rounded-lg border text-[9px] font-bold flex items-center justify-center gap-1"
                            style={{ borderColor: `${themeAccentInput}30`, backgroundColor: `${themeAccentInput}15`, color: themeAccentInput }}
                          >
                            <Palette className="w-3 h-3" />
                            <span>Themes & Icons</span>
                          </button>
                        </div>
                      </div>

                      {/* 2-Column Grid Layout matching student profile exactly */}
                      <div className={cn(
                        "grid gap-3",
                        simulatorDeviceMode === 'desktop' ? "grid-cols-12" : "grid-cols-1"
                      )}>
                        
                        {/* Left Column: Digital Student ID & Academic Dossier (5 cols on desktop) */}
                        <div className={cn(
                          simulatorDeviceMode === 'desktop' ? "col-span-5 space-y-3" : "space-y-3"
                        )}>
                          
                          {/* Scholar Digital Pass card (avatar_badge) */}
                          <div
                            onClick={() => { setSelectedCardTarget('avatar_badge'); setBuilderTab('cards'); }}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden space-y-3",
                              selectedCardTarget === 'avatar_badge' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                            )}
                            style={{
                              background: themeCardCustomizations.avatar_badge?.bgColor || themeCardBgColor,
                              borderColor: themeCardCustomizations.avatar_badge?.borderColor || themeBorderColor,
                              borderWidth: '1.5px',
                              boxShadow: themeCardCustomizations.avatar_badge?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                            }}
                          >
                            {themeCardCustomizations.avatar_badge?.badgeEmoji && (
                              <div className="absolute top-2 right-2 text-base select-none drop-shadow animate-bounce">
                                {themeCardCustomizations.avatar_badge.badgeEmoji}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[8px] font-mono tracking-widest uppercase opacity-70 block font-semibold">
                                  SCHOLAR DIGITAL PASS
                                </span>
                                <h3 className="text-xs font-bold text-white">بطاقة الهوية الجامعية</h3>
                              </div>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: `0 0 8px ${themeAccentInput}` }} />
                            </div>

                            {/* QR Presentation */}
                            <div className="bg-white p-2.5 rounded-lg max-w-[120px] mx-auto flex items-center justify-center">
                              <QrCode className="w-20 h-24 text-black" />
                            </div>

                            <div className="text-center space-y-0.5">
                              <span className="text-[8px] font-mono uppercase tracking-widest opacity-60 font-semibold">
                                STUDENT CODE / كود الطالب
                              </span>
                              <div className="text-sm font-black font-mono tracking-widest" style={{ color: themeAccentInput }}>
                                [ 937482 ]
                              </div>
                            </div>

                            {/* Card controls */}
                            <div className="grid grid-cols-2 gap-2 text-center pt-1">
                              <span className="py-1 px-2 rounded-md border text-[9px] font-bold flex items-center justify-center gap-1 border-white/10 bg-white/5">
                                <Copy className="w-2.5 h-2.5" style={{ color: themeAccentInput }} />
                                Copy ID
                              </span>
                              <span className="py-1 px-2 rounded-md border text-[9px] font-bold flex items-center justify-center gap-1 border-white/10 bg-white/5">
                                Save QR
                              </span>
                            </div>
                          </div>

                          {/* Academic Dossier card (registry) */}
                          <div
                            onClick={() => { setSelectedCardTarget('registry'); setBuilderTab('cards'); }}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden space-y-3",
                              selectedCardTarget === 'registry' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                            )}
                            style={{
                              background: themeCardCustomizations.registry?.bgColor || themeCardBgColor,
                              borderColor: themeCardCustomizations.registry?.borderColor || themeBorderColor,
                              borderWidth: '1.5px',
                              boxShadow: themeCardCustomizations.registry?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                            }}
                          >
                            {themeCardCustomizations.registry?.badgeEmoji && (
                              <div className="absolute top-2 right-2 text-base select-none drop-shadow animate-bounce">
                                {themeCardCustomizations.registry.badgeEmoji}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[8px] font-mono tracking-widest uppercase opacity-70 block font-semibold">
                                  ACADEMIC DOSSIER
                                </span>
                                <h3 className="text-xs font-bold text-white">بيانات القيد الجامعي</h3>
                              </div>
                              <GraduationCap className="w-4 h-4" style={{ color: themeAccentInput }} />
                            </div>

                            <div className="space-y-2 text-[10px]">
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="opacity-70">University:</span>
                                <span className="font-bold">Cairo University</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="opacity-70">Faculty / Major:</span>
                                <span className="font-bold text-right">Faculty of Medicine</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="opacity-70">Academic Year:</span>
                                <span className="font-bold text-right">3rd Year</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="opacity-70">Attendance Log:</span>
                                <span className="font-bold text-emerald-400">98.4% (Active)</span>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Right Column: Academic Courses & Assessments (7 cols on desktop) */}
                        <div className={cn(
                          simulatorDeviceMode === 'desktop' ? "col-span-7 space-y-3" : "space-y-3"
                        )}>
                          
                          {/* University Lecture Vault card (learning_track) */}
                          <div
                            onClick={() => { setSelectedCardTarget('learning_track'); setBuilderTab('cards'); }}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden space-y-3",
                              selectedCardTarget === 'learning_track' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                            )}
                            style={{
                              background: themeCardCustomizations.learning_track?.bgColor || themeCardBgColor,
                              borderColor: themeCardCustomizations.learning_track?.borderColor || themeBorderColor,
                              borderWidth: '1.5px',
                              boxShadow: themeCardCustomizations.learning_track?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                            }}
                          >
                            {themeCardCustomizations.learning_track?.badgeEmoji && (
                              <div className="absolute top-2 right-2 text-base select-none drop-shadow animate-bounce">
                                {themeCardCustomizations.learning_track.badgeEmoji}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[8px] font-mono tracking-widest uppercase opacity-70 block font-semibold">
                                  UNIVERSITY LECTURE VAULT
                                </span>
                                <h3 className="text-xs font-bold text-white">المحاضرات وملخصات الكلية</h3>
                              </div>
                              <BookOpen className="w-4 h-4" style={{ color: themeAccentInput }} />
                            </div>

                            {/* Course simulation */}
                            <div className="space-y-2.5">
                              <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-xs text-white">Anatomy & Physiology III</span>
                                  <span className="text-[10px] font-mono" style={{ color: themeAccentInput }}>Dr. Farouk</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-mono opacity-75">
                                  <span>Lecture 14: Cardiovascular System</span>
                                  <span>Completed</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: themeAccentInput }} />
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-xs text-white">Medical Biochemistry</span>
                                  <span className="text-[10px] font-mono" style={{ color: themeAccentInput }}>Dr. Sherif</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-mono opacity-75">
                                  <span>Lecture 8: Metabolic Pathways</span>
                                  <span>65% Progress</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: themeAccentInput }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Assessment & Benchmarks card (performance) */}
                          <div
                            onClick={() => { setSelectedCardTarget('performance'); setBuilderTab('cards'); }}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden space-y-3",
                              selectedCardTarget === 'performance' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                            )}
                            style={{
                              background: themeCardCustomizations.performance?.bgColor || themeCardBgColor,
                              borderColor: themeCardCustomizations.performance?.borderColor || themeBorderColor,
                              borderWidth: '1.5px',
                              boxShadow: themeCardCustomizations.performance?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                            }}
                          >
                            {themeCardCustomizations.performance?.badgeEmoji && (
                              <div className="absolute top-2 right-2 text-base select-none drop-shadow animate-bounce">
                                {themeCardCustomizations.performance.badgeEmoji}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[8px] font-mono tracking-widest uppercase opacity-70 block font-semibold">
                                  ASSESSMENT & BENCHMARKS
                                </span>
                                <h3 className="text-xs font-bold text-white">نتائج الامتحانات وبنوك الأسئلة</h3>
                              </div>
                              <ShieldCheck className="w-4 h-4" style={{ color: themeAccentInput }} />
                            </div>

                            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-300 font-bold">Midterm Assessment Diagnostic</span>
                                <span className="text-xs font-black text-emerald-400 font-mono">96% (Grade A+)</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: '96%', backgroundColor: themeAccentInput }} />
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono opacity-60">
                                <span>Total Questions: 50 MCQ</span>
                                <span>Correct: 48</span>
                              </div>
                            </div>
                          </div>

                          {/* Badges & Achievements (badges) */}
                          <div 
                            onClick={() => { setSelectedCardTarget('badges'); setBuilderTab('cards'); }}
                            className={cn(
                              "p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                              selectedCardTarget === 'badges' && builderTab === 'cards' ? "ring-2 ring-purple-500 scale-[1.01]" : "hover:border-white/30"
                            )}
                            style={{
                              background: themeCardCustomizations.badges?.bgColor || themeCardBgColor,
                              borderColor: themeCardCustomizations.badges?.borderColor || themeBorderColor,
                              borderWidth: '1.5px',
                              boxShadow: themeCardCustomizations.badges?.glowIntensity === 'neon' ? `0 0 24px ${themeAccentInput}80` : undefined,
                            }}
                          >
                            {themeCardCustomizations.badges?.badgeEmoji && (
                              <div className="absolute top-2 right-2 text-base select-none drop-shadow animate-bounce">
                                {themeCardCustomizations.badges.badgeEmoji}
                              </div>
                            )}

                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[8px] font-mono tracking-widest uppercase opacity-70 block font-semibold">
                                SCHOLAR ACHIEVEMENTS & LEVEL PROGRESSION
                              </span>
                              <span className="text-[9px] font-bold font-mono" style={{ color: themeAccentInput }}>LEVEL 14</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex items-center gap-1 p-1.5 rounded bg-white/[0.02] border border-white/5 text-[9px] text-white">
                                <span className="text-xs">🌱</span>
                                <span className="truncate">Initiate</span>
                              </div>
                              <div className="flex items-center gap-1 p-1.5 rounded bg-white/[0.02] border border-white/5 text-[9px] text-white">
                                <span className="text-xs">🔥</span>
                                <span className="truncate">7-Day Streak</span>
                              </div>
                              <div className="flex items-center gap-1 p-1.5 rounded bg-white/[0.02] border border-white/5 text-[9px] text-white">
                                <span className="text-xs">🏆</span>
                                <span className="truncate">Top Performer</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 italic text-center font-mono flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Real-time visual synchronization: Changes reflect instantly across desktop & mobile simulations and student views.
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">
                Theme will be published to the Asset Library & available for student equipping.
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setNewThemeOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs font-mono">
                  🚀 Publish Custom Theme
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: EDIT SEASON */}
      <Dialog open={editSeasonOpen} onOpenChange={setEditSeasonOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <Edit className="h-5 w-5" /> Edit Academic Season Properties
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Update scheduling, title, or description of this active or passive season term.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSeason} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Season Title</Label>
              <Input
                placeholder="e.g. Season 3: Celestial Heights"
                value={editSeasonTitle}
                onChange={(e) => setEditSeasonTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Textarea
                placeholder="Academic term highlights and milestone description..."
                value={editSeasonDescription}
                onChange={(e) => setEditSeasonDescription(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Start Date</Label>
                <Input
                  type="date"
                  value={editSeasonStartDate}
                  onChange={(e) => setEditSeasonStartDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">End Date</Label>
                <Input
                  type="date"
                  value={editSeasonEndDate}
                  onChange={(e) => setEditSeasonEndDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Max Seasonal Level Cap</Label>
                <Input
                  type="number"
                  value={editSeasonCap}
                  onChange={(e) => setEditSeasonCap(Number(e.target.value))}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Theme Color</Label>
                <Input
                  type="color"
                  value={editSeasonColor}
                  onChange={(e) => setEditSeasonColor(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 h-9 p-1 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setEditSeasonOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: EDIT REWARD */}
      <Dialog open={editRewardOpen} onOpenChange={setEditRewardOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-400">
              <Edit className="h-5 w-5" /> Edit Level Milestone Reward
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Update level constraints, titles, styles, or specific assets linked to this milestone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateReward} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Target Season</Label>
                <Select value={editRewardSeasonId} onValueChange={setEditRewardSeasonId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        Season {s.seasonNumber} ({s.title})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Milestone Grid Order (Position)</Label>
                <Input
                  type="number"
                  value={editRewardLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditRewardLevel(val);
                  }}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            {/* Unlocking Requirement Toggle Setting */}
            <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-500 block">🏆 Unlock Requirement</span>
                  <span className="text-[10px] text-zinc-400 block">Require a specific student level to unlock?</span>
                </div>
                <Switch 
                  checked={editRewardRequireLevel}
                  onCheckedChange={(val) => {
                    setEditRewardRequireLevel(val);
                  }}
                />
              </div>

              {editRewardRequireLevel ? (
                <div className="text-xs p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg animate-in fade-in duration-200">
                  ⭐ Student must reach <strong>Level {editRewardLevel}</strong> to unlock this reward.
                </div>
              ) : (
                <div className="space-y-3 pt-1 border-t border-zinc-800/60 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Alternative Unlock Type</Label>
                    <Select 
                      value={editRewardRequirementType === 'level' ? 'checkin' : editRewardRequirementType} 
                      onValueChange={(val: any) => {
                        setEditRewardRequirementType(val);
                      }}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="checkin" className="text-xs">🔥 Daily App Check-ins count</SelectItem>
                        <SelectItem value="tests" className="text-xs">📝 Tests Completed count</SelectItem>
                        <SelectItem value="courses" className="text-xs">📺 Courses Watched count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Target Count</Label>
                    <Input
                      type="number"
                      value={editRewardRequirementValue}
                      onChange={(e) => setEditRewardRequirementValue(Number(e.target.value))}
                      className="bg-zinc-900 border-zinc-800 text-xs font-mono h-8"
                      placeholder="Enter target count (e.g. 15)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Reward Title</Label>
              <Input
                placeholder="e.g. Kero the Frog Companion"
                value={editRewardTitle}
                onChange={(e) => setEditRewardTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Textarea
                placeholder="What does this unlock for the student?"
                value={editRewardDescription}
                onChange={(e) => setEditRewardDescription(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs h-16"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Type</Label>
                <Select value={editRewardType} onValueChange={(v) => {
                  const val = v as RewardType;
                  setEditRewardType(val);
                  // Auto replace icon if matches old defaults
                  if (val === 'pet') setEditRewardIcon('🐸');
                  else if (val === 'theme') setEditRewardIcon('🌌');
                  else if (val === 'avatar') setEditRewardIcon('👦');
                  else setEditRewardIcon('🌱');
                }}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="pet" className="text-xs">🐾 Pet</SelectItem>
                    <SelectItem value="theme" className="text-xs">🎨 Theme</SelectItem>
                    <SelectItem value="avatar" className="text-xs">👤 Avatar</SelectItem>
                    <SelectItem value="badge" className="text-xs">🏆 Badge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Rarity</Label>
                <Select value={editRewardRarity} onValueChange={(v) => setEditRewardRarity(v as RewardRarity)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Common" className="text-xs">Common</SelectItem>
                    <SelectItem value="Rare" className="text-xs">Rare</SelectItem>
                    <SelectItem value="Epic" className="text-xs">Epic</SelectItem>
                    <SelectItem value="Legendary" className="text-xs">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Emoji / Icon</Label>
                <Input
                  placeholder="🐸"
                  value={editRewardIcon}
                  onChange={(e) => setEditRewardIcon(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs text-center text-lg font-bold"
                />
              </div>
            </div>

            {/* Quick Preset Picker Panel for Editing */}
            <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-300">Quick Icon Picker Panel</Label>
                {editRewardType !== 'pet' && (
                  <span className="text-[10px] text-zinc-500">Select any category below</span>
                )}
              </div>

              {editRewardType === 'pet' ? (
                <div className="text-[10px] text-emerald-400 font-bold mb-1">🐾 Showing cute companion pets (No duplicates)</div>
              ) : (
                <div className="space-y-2">
                  {/* Category Tabs for non-pet types */}
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'avatar', 'theme', 'badge'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditRewardEmojiCategory(cat)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer",
                          editRewardEmojiCategory === cat
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {cat === 'all' && '✨ All Emojis'}
                        {cat === 'avatar' && '👤 Avatars'}
                        {cat === 'theme' && '🎨 Themes'}
                        {cat === 'badge' && '🏆 Badges'}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <Input
                    placeholder="🔍 Search all emojis..."
                    value={editRewardEmojiSearch}
                    onChange={(e) => setEditRewardEmojiSearch(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-8 text-white"
                  />
                </div>
              )}

              {/* Emoji Grid */}
              <div className="flex flex-wrap gap-1 p-1 bg-zinc-950 max-h-36 overflow-y-auto font-mono rounded border border-zinc-900/50 mt-1">
                {(editRewardType === 'pet'
                  ? UNIQUE_EMOJIS.pet
                  : (() => {
                      let baseList: string[] = [];
                      if (editRewardEmojiCategory === 'all') {
                        baseList = Array.from(new Set([...UNIQUE_EMOJIS.avatar, ...UNIQUE_EMOJIS.theme, ...UNIQUE_EMOJIS.badge]));
                      } else {
                        baseList = UNIQUE_EMOJIS[editRewardEmojiCategory];
                      }
                      
                      if (editRewardEmojiSearch) {
                        const searchLower = editRewardEmojiSearch.toLowerCase();
                        return baseList.filter(emoji => {
                          const keywords = EMOJI_NAMES[emoji] || '';
                          return keywords.toLowerCase().includes(searchLower);
                        });
                      }
                      return baseList;
                    })()
                ).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEditRewardIcon(emoji)}
                    className={cn(
                      "w-7 h-7 rounded text-sm hover:bg-zinc-800 transition-all flex items-center justify-center shrink-0 cursor-pointer",
                      editRewardIcon === emoji ? "bg-amber-500/20 border border-amber-500 text-white font-bold" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {editRewardType === 'pet' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">QR Code Animation style</Label>
                  <Select value={editRewardAnimationType} onValueChange={(v) => setEditRewardAnimationType(v as any)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="bounce" className="text-xs">🐸 Jumps up & down (bounce)</SelectItem>
                      <SelectItem value="crawl" className="text-xs">🐌 Crawls across the bottom (crawl)</SelectItem>
                      <SelectItem value="sleep" className="text-xs">🐱 Sleeps peacefully at the top (sleep)</SelectItem>
                      <SelectItem value="flutter" className="text-xs">🐦 Flutters wings & hovers (flutter)</SelectItem>
                      <SelectItem value="fire" className="text-xs">🐉 Breathes fire on bottom right (fire)</SelectItem>
                      <SelectItem value="none" className="text-xs">🐾 Sits quietly (no animation)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Pet Motivational Speech Quote</Label>
                  <Input
                    placeholder="e.g. Ribbit! Focus and make a big leap forward today!"
                    value={editRewardPetQuote}
                    onChange={(e) => setEditRewardPetQuote(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
              </>
            )}

            {editRewardType === 'theme' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Linked Theme Class</Label>
                <Select value={editRewardThemeClass} onValueChange={setEditRewardThemeClass}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                    <SelectValue placeholder="Select from Custom Theme Library" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {libraryThemes.filter((theme) => theme.category !== 'event').map((theme) => (
                      <SelectItem key={theme.id} value={theme.themeClass} className="text-xs">
                        {theme.title} ({theme.themeClass})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setEditRewardOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
