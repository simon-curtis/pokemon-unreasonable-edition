@ Route N-1 — "The Obvious Path"
@ Connects: Nulltown (south) -> Ferro City (north)
@ A comically over-tutorialized route with Bureau presence

Route101_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, Route101_OnTransition
	.byte 0

Route101_OnTransition:
	end

@ ========================
@ Signs
@ ========================

Route101_EventScript_Sign1::
	msgbox Route101_Text_0, MSGBOX_SIGN
	end

@ ── Text ──

Route101_Text_0:
	.string "Legally I have to tell you that I'm\l"
	.string "a sign.$"

Route101_Text_Sign1:
	.string "WELCOME TO ROUTE N-1!\p"
	.string "Press the D-PAD to walk!\n"
	.string "You’re doing great!$"

Route101_EventScript_Sign2::
	msgbox Route101_Text_Sign2, MSGBOX_SIGN
	end

Route101_Text_Sign2:
	.string "TALL GRASS contains wild POKéMON!\p"
	.string "This is probably not news to you\n"
	.string "but we are legally required to\l"
	.string "say it!$"

Route101_EventScript_Sign3::
	msgbox Route101_Text_Sign3, MSGBOX_SIGN
	end

Route101_Text_Sign3:
	.string "TIP: POKéMON can be weakened and\n"
	.string "caught!\p"
	.string "We know you know this!\n"
	.string "Our lawyers don’t!$"

Route101_EventScript_Sign4::
	msgbox Route101_Text_Sign4, MSGBOX_SIGN
	end

Route101_Text_Sign4:
	.string "FERRO CITY - Straight ahead!\p"
	.string "You’ve almost made it through\n"
	.string "the tutorial route!\p"
	.string "(This IS the tutorial route.\n"
	.string "The whole thing.)$"

@ ========================
@ Tutorial NPC 1 — Cheerful Youngster
@ ========================

Route101_EventScript_TutorialNPC1::
	msgbox Route101_Text_TutorialNPC1, MSGBOX_NPC
	end

Route101_Text_TutorialNPC1:
	.string "Hi! Did you know you can SAVE\n"
	.string "your game from the menu?\p"
	.string "I know that seems obvious.\n"
	.string "I know you already knew.\p"
	.string "They only taught me one thing\n"
	.string "and you already knew it.$"

@ ========================
@ Tutorial NPC 2 — Anxious Hiker
@ ========================

Route101_EventScript_TutorialNPC2::
	msgbox Route101_Text_TutorialNPC2, MSGBOX_NPC
	end

Route101_Text_TutorialNPC2:
	.string "I taught my son to swim by\n"
	.string "throwing him in the deep end.\p"
	.string "Bit extreme but he got out\n"
	.string "of that sack eventually.$"

@ ========================
@ Tutorial NPC 3 — Stressed Office Worker
@ ========================

Route101_EventScript_TutorialNPC3::
	msgbox Route101_Text_TutorialNPC3, MSGBOX_NPC
	end

Route101_Text_TutorialNPC3:
	.string "I go jogging with my wife\n"
	.string "every morning.\p"
	.string "I am on lap six and she still\n"
	.string "has not got out of the boot.$"

@ ========================
@ Tutorial NPC 4 — Dead-eyed, sitting
@ ========================

Route101_EventScript_TutorialNPC4::
	msgbox Route101_Text_TutorialNPC4, MSGBOX_NPC
	end

Route101_Text_TutorialNPC4:
	.string "…\p"
	.string "STATUS CONDITIONS.\p"
	.string "POISON drains HP over time.\n"
	.string "PARALYSIS halves speed.\l"
	.string "SLEEP prevents action.\p"
	.string "Nobody makes it this far into\n"
	.string "the route anymore.\p"
	.string "I’ve been talking to the trees.\n"
	.string "The trees don’t have great\l"
	.string "advice.$"

@ ========================
@ Tutorial NPC 5 — Hidden behind tree
@ ========================

Route101_EventScript_TutorialNPC5::
	msgbox Route101_Text_TutorialNPC5, MSGBOX_NPC
	end

Route101_Text_TutorialNPC5:
	.string "…Oh. You found me.\p"
	.string "I was supposed to teach trainers\n"
	.string "about HMs. Then they cut HMs\l"
	.string "from my script.\p"
	.string "So now I just… live here.\n"
	.string "Behind this tree.\p"
	.string "It’s not so bad. The TAILLOW\n"
	.string "bring me berries sometimes.\p"
	.string "If you could not tell anyone\n"
	.string "I’m here, that’d be great.\l"
	.string "I don’t want them to give me\l"
	.string "a new script.$"

@ ========================
@ Bureau Employee 1
@ ========================

Route101_EventScript_BureauEmployee1::
	msgbox Route101_Text_BureauEmployee1, MSGBOX_NPC
	end

Route101_Text_BureauEmployee1:
	.string "RESONANCE ENERGY CORP\n"
	.string "Field Survey - Question 1 of 1:\p"
	.string "How are your POKéMON feeling\n"
	.string "right now?\p"
	.string "Emotionally, I mean.\n"
	.string "On a scale of 1 to 10.\p"
	.string "…No, there’s no option for\n"
	.string "“why are you asking.”\l"
	.string "Just… pick a number.$"

@ ========================
@ Bureau Employee 2
@ ========================

Route101_EventScript_BureauEmployee2::
	msgbox Route101_Text_BureauEmployee2, MSGBOX_NPC
	end

Route101_Text_BureauEmployee2:
	.string "Hm? Oh, don’t mind me.\n"
	.string "Just taking readings.\p"
	.string "RESONANCE ENERGY levels on this\n"
	.string "route are perfectly NORMAL.\p"
	.string "Very, very normal.\n"
	.string "Aggressively normal.\p"
	.string "I’m going to write “normal”\n"
	.string "in my report three more times\l"
	.string "just to be safe.$"

@ ========================
@ Bureau Employee 3 — On phone
@ ========================

Route101_EventScript_BureauEmployee3::
	msgbox Route101_Text_BureauEmployee3, MSGBOX_NPC
	end

Route101_Text_BureauEmployee3:
	.string "…yes, another new trainer.\n"
	.string "Starter looks healthy.\p"
	.string "Bond metrics are baseline.\n"
	.string "Flagged for monitoring.\p"
	.string "…What? No, I’m not talking to\n"
	.string "you. I’m on the phone.\p"
	.string "Carry on. Nothing to see.\n"
	.string "Move along.$"

@ ========================
@ Trainer Battle — Bug Catcher Kyle
@ ========================

Route101_EventScript_Kyle::
	trainerbattle_single TRAINER_KYLE, Route101_Text_KyleIntro, Route101_Text_KyleDefeated
	msgbox Route101_Text_KylePostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_KyleIntro:
	.string "I’ve been standing in this grass\n"
	.string "for HOURS waiting for someone\l"
	.string "to walk by!\p"
	.string "Now we HAVE to battle!\n"
	.string "It’s the LAW! Probably!$"

Route101_Text_KyleDefeated:
	.string "Aw man… my bugs weren’t\n"
	.string "ready for that.$"

Route101_Text_KylePostBattle:
	.string "The tutorial guy said making eye\n"
	.string "contact means you have to battle.\p"
	.string "I have been making eye contact\n"
	.string "with a tree for an hour.\p"
	.string "It has not battled me yet.\n"
	.string "But I am patient.$"

@ ========================
@ Trainer Battle — Lass Penny
@ ========================

Route101_EventScript_Penny::
	trainerbattle_single TRAINER_PENNY, Route101_Text_PennyIntro, Route101_Text_PennyDefeated
	msgbox Route101_Text_PennyPostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_PennyIntro:
	.string "Hey! My ZIGZAGOON picked up\n"
	.string "something weird on this route.\p"
	.string "A clipboard that says\n"
	.string "“EMOTIONAL OUTPUT TRACKING.”\p"
	.string "Anyway, let’s battle!$"

Route101_Text_PennyDefeated:
	.string "You’re pretty strong for someone\n"
	.string "who just left NULLTOWN.$"

Route101_Text_PennyPostBattle:
	.string "That clipboard had a bunch of\n"
	.string "trainer names on it.\p"
	.string "Mine was on there. So was yours.\n"
	.string "Weird, right?\p"
	.string "I’m sure it’s nothing.$"

@ ========================
@ Trainer Battle — Youngster Brad
@ ========================

Route101_EventScript_Brad::
	trainerbattle_single TRAINER_BRAD, Route101_Text_BradIntro, Route101_Text_BradDefeated
	msgbox Route101_Text_BradPostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_BradIntro:
	.string "You DARE walk through MY\n"
	.string "corridor?!\p"
	.string "I battle everyone! EVERYONE!\n"
	.string "No exceptions! NO MERCY!$"

Route101_Text_BradDefeated:
	.string "OK maybe some mercy\n"
	.string "would be nice...$"

Route101_Text_BradPostBattle:
	.string "I have battled forty-seven\n"
	.string "trainers today.\p"
	.string "My TAILLOW is begging me to\n"
	.string "stop. I will not stop.$"

@ ========================
@ Trainer Battle — Beauty Trixie
@ ========================

Route101_EventScript_Trixie::
	trainerbattle_single TRAINER_TRIXIE, Route101_Text_TrixieIntro, Route101_Text_TrixieDefeated
	msgbox Route101_Text_TrixiePostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_TrixieIntro:
	.string "You have nice eyes.\p"
	.string "I collect eyes.\p"
	.string "I mean- battle me.$"

Route101_Text_TrixieDefeated:
	.string "Fine. Keep your eyes.$"

Route101_Text_TrixiePostBattle:
	.string "I'm kidding about the eyes.\p"
	.string "It's teeth.$"

@ ========================
@ Trainer Battle — Camper Dave
@ ========================

Route101_EventScript_Dave::
	trainerbattle_single TRAINER_DAVE, Route101_Text_DaveIntro, Route101_Text_DaveDefeated
	msgbox Route101_Text_DavePostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_DaveIntro:
	.string "I set up camp THREE DAYS AGO\n"
	.string "and nobody has walked by!\p"
	.string "YOU! BATTLE! NOW!\n"
	.string "I need human interaction!$"

Route101_Text_DaveDefeated:
	.string "That was the most fun I have\n"
	.string "had in seventy-two hours.$"

Route101_Text_DavePostBattle:
	.string "My tent is right there.\n"
	.string "I have been living on this route.\p"
	.string "On purpose. By choice.\p"
	.string "Something howls at 3 AM every\n"
	.string "night. It is not a POKéMON.\p"
	.string "Otherwise it is fine.$"

@ ========================
@ Trainer Battle — Rich Boy Sterling
@ ========================

Route101_EventScript_Sterling::
	trainerbattle_single TRAINER_STERLING, Route101_Text_SterlingIntro, Route101_Text_SterlingDefeated
	msgbox Route101_Text_SterlingPostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_SterlingIntro:
	.string "Do you know how BORING it is\n"
	.string "being rich on a ROUTE?\p"
	.string "Fight me so I feel something.$"

Route101_Text_SterlingDefeated:
	.string "Fascinating.\n"
	.string "I felt a brief emotion.\p"
	.string "It has passed.$"

Route101_Text_SterlingPostBattle:
	.string "Father says battling builds\n"
	.string "character.\p"
	.string "I think Father just wanted me\n"
	.string "out of the house.$"

@ ========================
@ Trainer Battle — Picnicker Marge
@ ========================

Route101_EventScript_Marge::
	trainerbattle_single TRAINER_MARGE, Route101_Text_MargeIntro, Route101_Text_MargeDefeated
	msgbox Route101_Text_MargePostBattle, MSGBOX_AUTOCLOSE
	end

Route101_Text_MargeIntro:
	.string "Sandwich.\p"
	.string "You want a sandwich.\p"
	.string "I can tell. I can always tell.\p"
	.string "Battle me for the sandwich.$"

Route101_Text_MargeDefeated:
	.string "The sandwich is yours.\p"
	.string "Guard it with your life.$"

Route101_Text_MargePostBattle:
	.string "People think I'm the sandwich\n"
	.string "lady.\p"
	.string "I am not the sandwich lady.\p"
	.string "The sandwiches chose me.$"

@ ========================
@ Item Giver — Old Woman (Potion)
@ ========================

Route101_EventScript_GivePotion::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_ROUTE_N1_POTION_NPC, Route101_EventScript_GivePotion_Done
	msgbox Route101_Text_GivePotion, MSGBOX_DEFAULT
	giveitem ITEM_POTION
	setflag FLAG_RECEIVED_ROUTE_N1_POTION_NPC
	release
	end

Route101_EventScript_GivePotion_Done::
	msgbox Route101_Text_GivePotion_After, MSGBOX_DEFAULT
	release
	end

Route101_Text_GivePotion:
	.string "Oh dear, you look tired!\n"
	.string "Here, take this!\p"
	.string "I give one to every trainer\n"
	.string "who passes through.\p"
	.string "I have given away four hundred\n"
	.string "POTIONS this year.\p"
	.string "I sold my house to buy them.\p"
	.string "Worth it.$"

Route101_Text_GivePotion_After:
	.string "I already gave you a POTION!\n"
	.string "I am generous, not senile.$"

@ ========================
@ Item Giver — Fat Man (Oran Berry)
@ ========================

Route101_EventScript_GiveOranBerry::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_ROUTE_N1_ORAN_BERRY, Route101_EventScript_GiveOranBerry_Done
	msgbox Route101_Text_GiveOranBerry, MSGBOX_DEFAULT
	giveitem ITEM_ORAN_BERRY
	setflag FLAG_RECEIVED_ROUTE_N1_ORAN_BERRY
	release
	end

Route101_EventScript_GiveOranBerry_Done::
	msgbox Route101_Text_GiveOranBerry_After, MSGBOX_DEFAULT
	release
	end

Route101_Text_GiveOranBerry:
	.string "Hey! You look hungry!\n"
	.string "Have an ORAN BERRY!\p"
	.string "I grow them myself!\n"
	.string "Right here! On the route!\p"
	.string "The BUREAU people keep asking\n"
	.string "why I am farming on a public\l"
	.string "road.\p"
	.string "None of their business!$"

Route101_Text_GiveOranBerry_After:
	.string "One berry per customer!\n"
	.string "I have a system!$"

@ ========================
@ Item Giver — Sailor (Repel)
@ ========================

Route101_EventScript_GiveRepel::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_ROUTE_N1_REPEL, Route101_EventScript_GiveRepel_Done
	msgbox Route101_Text_GiveRepel, MSGBOX_DEFAULT
	giveitem ITEM_REPEL
	setflag FLAG_RECEIVED_ROUTE_N1_REPEL
	release
	end

Route101_EventScript_GiveRepel_Done::
	msgbox Route101_Text_GiveRepel_After, MSGBOX_DEFAULT
	release
	end

Route101_Text_GiveRepel:
	.string "Ahoy! This route is CRAWLING\n"
	.string "with wild encounters!\p"
	.string "Here- take this REPEL!\p"
	.string "...Why is a SAILOR on a land\n"
	.string "route?\p"
	.string "I have been lost for two weeks.\n"
	.string "I have never been happier.$"

Route101_Text_GiveRepel_After:
	.string "Still lost!\n"
	.string "Still having a great time!$"

@ ========================
@ Item Giver — Girl (Antidote)
@ ========================

Route101_EventScript_GiveAntidote::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_ROUTE_N1_ANTIDOTE_NPC, Route101_EventScript_GiveAntidote_Done
	msgbox Route101_Text_GiveAntidote, MSGBOX_DEFAULT
	giveitem ITEM_ANTIDOTE
	setflag FLAG_RECEIVED_ROUTE_N1_ANTIDOTE_NPC
	release
	end

Route101_EventScript_GiveAntidote_Done::
	msgbox Route101_Text_GiveAntidote_After, MSGBOX_DEFAULT
	release
	end

Route101_Text_GiveAntidote:
	.string "Psst! Hey! Take this ANTIDOTE!\p"
	.string "There is a guy with a WURMPLE\n"
	.string "around here and that thing\l"
	.string "loves to POISON STING people.\p"
	.string "Consider this a public service.$"

Route101_Text_GiveAntidote_After:
	.string "Did you get poisoned yet?\n"
	.string "It is only a matter of time.$"

@ ========================
@ Item Giver — Pokefan F (Great Ball)
@ ========================

Route101_EventScript_GiveGreatBall::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_ROUTE_N1_GREAT_BALL, Route101_EventScript_GiveGreatBall_Done
	msgbox Route101_Text_GiveGreatBall, MSGBOX_DEFAULT
	giveitem ITEM_GREAT_BALL
	setflag FLAG_RECEIVED_ROUTE_N1_GREAT_BALL
	release
	end

Route101_EventScript_GiveGreatBall_Done::
	msgbox Route101_Text_GiveGreatBall_After, MSGBOX_DEFAULT
	release
	end

Route101_Text_GiveGreatBall:
	.string "OMG are you a new trainer?!\n"
	.string "You NEED this! Take it!\p"
	.string "I buy these in BULK.\n"
	.string "I have a problem.\p"
	.string "My house is full of GREAT BALLS\n"
	.string "and I cannot stop buying them.\p"
	.string "Please take more. Please.$"

Route101_Text_GiveGreatBall_After:
	.string "I would give you another but\n"
	.string "my therapist says I need to\l"
	.string "set BOUNDARIES.$"

@ ========================
@ Unsolicited Advice — Compatibility Expert
@ ========================

Route101_EventScript_AdviceCompat::
	msgbox Route101_Text_AdviceCompat, MSGBOX_NPC
	end

Route101_Text_AdviceCompat:
	.string "When two POKéMON love each\n"
	.string "other very much, they go to\l"
	.string "the DAY CARE.\p"
	.string "What happens at the DAY CARE\n"
	.string "STAYS at the DAY CARE.\p"
	.string "The key is EGG GROUP\n"
	.string "COMPATIBILITY. I have studied\l"
	.string "this for thirty years.\p"
	.string "My wife left me.\n"
	.string "But my BREEDING program\l"
	.string "is flawless.$"

@ ========================
@ Unsolicited Advice — Breeding Old Man
@ ========================

Route101_EventScript_AdviceBreeding::
	msgbox Route101_Text_AdviceBreeding, MSGBOX_NPC
	end

Route101_Text_AdviceBreeding:
	.string "I have watched POKéMON breed\n"
	.string "for forty years.\p"
	.string "My wife asked me to stop.\p"
	.string "I said it is my JOB.\p"
	.string "She said I am retired and this\n"
	.string "is a public park.$"

@ ========================
@ Unsolicited Advice — Ninja Boy (Moves)
@ ========================

Route101_EventScript_AdviceMoves::
	msgbox Route101_Text_AdviceMoves, MSGBOX_NPC
	end

Route101_Text_AdviceMoves:
	.string "BUY A MAN EAT FISH, HE DAY.\p"
	.string "TEACH FISH MAN, TO A LIFETIME.$"

@ ========================
@ Unsolicited Advice — Woman (Held Items)
@ ========================

Route101_EventScript_AdviceItems::
	msgbox Route101_Text_AdviceItems, MSGBOX_NPC
	end

Route101_Text_AdviceItems:
	.string "Always give your POKéMON\n"
	.string "something to hold.\p"
	.string "My MACHOKE holds me every night.\p"
	.string "My husband is fine with it.\p"
	.string "He watches.$"

@ ========================
@ Unsolicited Advice — Cook (PP)
@ ========================

Route101_EventScript_AdvicePP::
	msgbox Route101_Text_AdvicePP, MSGBOX_NPC
	end

Route101_Text_AdvicePP:
	.string "As a COOK I know the importance\n"
	.string "of keeping your PP up.\p"
	.string "Nothing worse than low PP\n"
	.string "in the middle of a battle.\p"
	.string "My wife says the same thing.$"

@ ========================
@ Exit Fakeout Trigger — North exit
@ ========================

Route101_EventScript_ExitFakeout::
	lock
	msgbox Route101_Text_ExitFakeout1, MSGBOX_DEFAULT
	waitbuttonpress
	msgbox Route101_Text_ExitFakeout2, MSGBOX_DEFAULT
	setvar VAR_ROUTE_N1_EXIT_TRIGGER, 1
	release
	end

Route101_Text_ExitFakeout1:
	.string "WAIT!\p"
	.string "Oh sorry, I forgot to mention-\n"
	.string "you have to speak to EVERY\l"
	.string "SINGLE PERSON on this route\l"
	.string "before you can progress.\p"
	.string "All of them. Every one.\n"
	.string "Including the ones hiding.\p"
	.string "This is mandatory. It is in\n"
	.string "the TRAINER HANDBOOK, page 47.$"

Route101_Text_ExitFakeout2:
	.string "...\p"
	.string "SIKE!\p"
	.string "Go ahead, I do not actually\n"
	.string "care.\p"
	.string "The look on your face though.\n"
	.string "Incredible.$"

Route101_EventScript_Sign5::
	lockall
	setwildbattle SPECIES_MEWTWO, 99
	dowildbattle
	releaseall
	end

Route101_EventScript_Item1::
	lockall
	releaseall
	end
