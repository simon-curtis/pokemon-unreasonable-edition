@ State descriptions for VAR_NULLTOWN_STATE
@ 0: Initial (just woke up)
@ 1: Talked to Mom
@ 2: Received starter from Thorn
@ 3: Received Pokedex and Poke Balls
@ 4: Seen screamer, free to explore

Nulltown_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, Nulltown_OnTransition
	map_script MAP_SCRIPT_ON_FRAME_TABLE, Nulltown_OnFrame
	.byte 0

Nulltown_Text_0:
	.string "QUIN: -- and THAT is our new\l"
	.string "neighbor’s house! Rating: four out\p"
	.string "of ten. Could use landscaping. Oh!\l"
	.string "You’re the new kid! I’m QUIN! I’m\p"
	.string "documenting my entire POKeMON\l"
	.string "journey for my followers. I have\p"
	.string "seven followers. Six of them are my\l"
	.string "mom on alt accounts.$"

Nulltown_EventScript_0:
	release
	end





@ ── Text ──

Nulltown_Text_1:
	.string "QUIN: You’re going on a journey\l"
	.string "too, right? RIGHT? Please say yes.\p"
	.string "I need a rival for content. Solo\l"
	.string "journeys don’t get engagement.$"

Nulltown_Text_2:
	.string "QUIN: So you’ll be my rival?$"

Nulltown_Text_3:
	.string "QUIN: I’m going to pretend you said\l"
	.string "yes because my narrative arc\p"
	.string "requires it. Go talk to PROFESSOR\l"
	.string "THORN. The barn. You’ll know it\p"
	.string "because it’s a barn.$"

Nulltown_Text_4:
	.string "QUIN: PERFECT! This is going to be\l"
	.string "incredible! Rating: ten out of ten!\p"
	.string "Maximum hype! Go talk to PROFESSOR\l"
	.string "THORN in the barn -- I mean, the\p"
	.string "FIELD LAB. They give out starters!$"

Nulltown_Text_5:
	.string "QUIN: Go talk to PROFESSOR THORN in\l"
	.string "the FIELD LAB already! I can’t\p"
	.string "start my content arc without a\l"
	.string "rival montage.$"

Nulltown_Text_6:
	.string "QUIN: You got a starter? Nice! Time\l"
	.string "to see who’s the better trainer.\p"
	.string "For content purposes. Meet me on\l"
	.string "ROUTE N-1! First one to FERRO CITY\p"
	.string "gets bragging rights!$"

Nulltown_OnFrame:
	map_script_2 VAR_NULLTOWN_STATE, 2, Nulltown_EventScript_Screamer
	map_script_2 VAR_NULLTOWN_STATE, 3, Nulltown_EventScript_Screamer
	.2byte 0

Nulltown_OnTransition:
	setflag FLAG_VISITED_NULLTOWN
	setflag FLAG_HIDE_NULLTOWN_MOM_OUTSIDE
	setflag FLAG_HIDE_NULLTOWN_TRUCK
	setflag FLAG_NULLTOWN_HIDE_SCREAMER
	end

@ ========================
@ Town Sign
@ ========================

Nulltown_EventScript_TownSign::
	msgbox Nulltown_Text_TownSign, MSGBOX_SIGN
	end

Nulltown_Text_TownSign:
	.string "NULLTOWN\n"
	.string "“We’re on the map. Technically.”$"

@ ========================
@ Building Signs
@ ========================

Nulltown_EventScript_LabSign::
	msgbox Nulltown_Text_LabSign, MSGBOX_SIGN
	end

Nulltown_Text_LabSign:
	.string "PROFESSOR THORN’S FIELD LAB\n"
	.string "(Formerly: A Barn)$"

Nulltown_EventScript_PlayersHouseSign::
	msgbox Nulltown_Text_PlayersHouseSign, MSGBOX_SIGN
	end

Nulltown_Text_PlayersHouseSign:
	.string "{PLAYER}’s HOUSE\n"
	.string "Recently moved in. Boxes everywhere.$"

Nulltown_EventScript_QuinsHouseSign::
	msgbox Nulltown_Text_QuinsHouseSign, MSGBOX_SIGN
	end

Nulltown_Text_QuinsHouseSign:
	.string "QUIN’s HOUSE\n"
	.string "A satellite dish sits on the roof.$"

@ ========================
@ Mailbox
@ ========================

Nulltown_EventScript_Mailbox::
	msgbox Nulltown_Text_Mailbox, MSGBOX_SIGN
	end

Nulltown_Text_Mailbox:
	.string "The mailbox is overstuffed with\n"
	.string "RESONANCE ENERGY CORP promotional\l"
	.string "materials.\p"
	.string "“Welcome to ABSURDIA!\n"
	.string "Your feelings power our future!“$"

@ ========================
@ Quin (Rival) - Exterior
@ ========================

Nulltown_EventScript_Quin::
	lock
	faceplayer
	compare VAR_NULLTOWN_STATE, 2
	goto_if_ge Nulltown_EventScript_QuinPostStarter
	goto_if_set FLAG_NULLTOWN_MET_QUIN, Nulltown_EventScript_QuinAlreadyMet
	msgbox Nulltown_Text_0, MSGBOX_DEFAULT
	msgbox Nulltown_Text_1, MSGBOX_DEFAULT
	msgbox Nulltown_Text_2, MSGBOX_YESNO
	compare VAR_RESULT, YES
	goto_if_eq Nulltown_EventScript_QuinSaidYes
Nulltown_EventScript_QuinSaidYes::
	msgbox Nulltown_Text_4, MSGBOX_DEFAULT
	setflag FLAG_NULLTOWN_MET_QUIN
	setvar VAR_NULLTOWN_STATE, 1
	release
	end

Nulltown_EventScript_QuinSaidNo::
	msgbox Nulltown_Text_3, MSGBOX_DEFAULT
	setflag FLAG_NULLTOWN_MET_QUIN
	setvar VAR_NULLTOWN_STATE, 1
	release
	end

Nulltown_EventScript_QuinAlreadyMet::
	msgbox Nulltown_Text_5, MSGBOX_DEFAULT
	release
	end

Nulltown_EventScript_QuinPostStarter::
	msgbox Nulltown_Text_6, MSGBOX_DEFAULT
	givemon SPECIES_PIKACHU, 5, ITEM_NONE
	compare VAR_RESULT, MON_GIVEN_TO_PARTY
	goto_if_eq Nulltown_EventScript_0

Nulltown_Text_QuinIntro1:
	.string "QUIN: -- and THAT is our new\n"
	.string "neighbor’s house! Rating: four\l"
	.string "out of ten. Could use landscaping.\p"
	.string "Oh! You’re the new kid! I’m QUIN!\p"
	.string "I’m documenting my entire POKeMON\n"
	.string "journey for my followers.\l"
	.string "I have seven followers.\l"
	.string "Six of them are my mom on alt\l"
	.string "accounts.$"

Nulltown_Text_QuinIntro2:
	.string "QUIN: You’re going on a journey\n"
	.string "too, right? RIGHT?\p"
	.string "Please say yes. I need a rival\n"
	.string "for content. Solo journeys don’t\l"
	.string "get engagement.$"

Nulltown_Text_QuinIntro3:
	.string "QUIN: So you’ll be my rival?$"

Nulltown_Text_QuinYes:
	.string "QUIN: PERFECT! This is going to be\n"
	.string "incredible! Rating: ten out of ten!\l"
	.string "Maximum hype!\p"
	.string "Go talk to PROFESSOR THORN in the\n"
	.string "barn -- I mean, the FIELD LAB.\l"
	.string "They give out starters!$"

Nulltown_Text_QuinNo:
	.string "QUIN: I’m going to pretend you said\n"
	.string "yes because my narrative arc\l"
	.string "requires it.\p"
	.string "Go talk to PROFESSOR THORN.\n"
	.string "The barn. You’ll know it because\l"
	.string "it’s a barn.$"

Nulltown_Text_QuinReminder:
	.string "QUIN: Go talk to PROFESSOR THORN\n"
	.string "in the FIELD LAB already!\p"
	.string "I can’t start my content arc\n"
	.string "without a rival montage.$"

Nulltown_Text_QuinPostStarter:
	.string "QUIN: You got a starter? Nice!\n"
	.string "Time to see who’s the better\l"
	.string "trainer. For content purposes.\p"
	.string "Meet me on ROUTE N-1! First one\n"
	.string "to FERRO CITY gets bragging rights!$"

@ ========================
@ Nulltown Resident
@ ========================

Nulltown_EventScript_Resident::
	lock
	faceplayer
	goto_if_ge VAR_NULLTOWN_STATE, 2, Nulltown_EventScript_ResidentPostStarter
	msgbox Nulltown_Text_Resident, MSGBOX_DEFAULT
	release
	end

Nulltown_EventScript_ResidentPostStarter::
	msgbox Nulltown_Text_ResidentPostStarter, MSGBOX_DEFAULT
	release
	end

Nulltown_Text_Resident:
	.string "I’ve lived in NULLTOWN for 30 years.\p"
	.string "Population: seven.\n"
	.string "And that’s counting generously.\p"
	.string "The sign says we’re on the map.\n"
	.string "I’ve checked. We barely are.$"

Nulltown_Text_ResidentPostStarter:
	.string "You got a POKeMON from the\n"
	.string "barn professor?\p"
	.string "Good. Get out of here while you\n"
	.string "can. There’s nothing in this town\l"
	.string "and there never will be.$"

@ ========================
@ Coord Events - Block exit before getting Pokemon
@ ========================

Nulltown_EventScript_CantLeaveYet::
	lock
	msgbox Nulltown_Text_CantLeaveYet, MSGBOX_DEFAULT
	applymovement OBJ_EVENT_ID_PLAYER, Nulltown_Movement_PushBack
	waitmovement 0
	release
	end

Nulltown_Movement_PushBack:
	walk_down
	step_end

Nulltown_Text_CantLeaveYet:
	.string "You should probably get a POKeMON\n"
	.string "before wandering into the wild\l"
	.string "grass. Just a thought.$"

@ ========================
@ Mystery Screamer — runs up after getting starter
@ ========================

Nulltown_EventScript_Screamer::
	lockall
	goto_if_set FLAG_NULLTOWN_SEEN_SCREAMER, Nulltown_EventScript_ScreamerDone
	addobject LOCALID_NULLTOWN_SCREAMER
	applymovement LOCALID_NULLTOWN_SCREAMER, Nulltown_Movement_ScreamerRunIn
	waitmovement 0
	playse SE_PIN
	applymovement LOCALID_NULLTOWN_SCREAMER, Common_Movement_ExclamationMark
	waitmovement 0
	applymovement LOCALID_NULLTOWN_SCREAMER, Nulltown_Movement_ScreamerFacePlayer
	waitmovement 0
	msgbox Nulltown_Text_0, MSGBOX_DEFAULT
	applymovement LOCALID_NULLTOWN_SCREAMER, Nulltown_Movement_ScreamerRunAway
	waitmovement 0
	removeobject LOCALID_NULLTOWN_SCREAMER
	setflag FLAG_NULLTOWN_SEEN_SCREAMER
	setvar VAR_NULLTOWN_STATE, 4
	releaseall
	end

Nulltown_EventScript_ScreamerDone::
	setvar VAR_NULLTOWN_STATE, 4
	releaseall
	end


@ ── Text ──

Nulltown_Movement_ScreamerRunIn:
	walk_faster_left
	walk_faster_left
	walk_faster_left
	walk_faster_left
	walk_faster_left
	walk_faster_left
	walk_faster_left
	walk_in_place_faster_left
	step_end

Nulltown_Movement_ScreamerFacePlayer:
	walk_in_place_faster_left
	step_end

Nulltown_Movement_ScreamerRunAway:
	walk_faster_right
	walk_faster_right
	walk_faster_right
	walk_faster_right
	walk_faster_right
	walk_faster_right
	walk_faster_right
	walk_faster_right
	step_end

Nulltown_Text_Screamer:
	.string "FUCK OFF!$"

Nulltown_EventScript_Event1::
	lockall
	@ TODO: event logic
	releaseall
	end
