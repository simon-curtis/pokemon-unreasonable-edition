Nulltown_ProfessorThornsLab_MapScripts::
	.byte 0

@ ========================
@ Professor Thorn
@ ========================

Nulltown_ThornsLab_EventScript_Thorn::
	lock
	faceplayer
	goto_if_ge VAR_NULLTOWN_STATE, 3, Nulltown_ThornsLab_EventScript_ThornPostPokedex
	goto_if_ge VAR_NULLTOWN_STATE, 2, Nulltown_ThornsLab_EventScript_ThornGivePokedex
	goto_if_set FLAG_NULLTOWN_RECEIVED_STARTER, Nulltown_ThornsLab_EventScript_ThornHasStarter
	msgbox Nulltown_ThornsLab_Text_ThornIntro1, MSGBOX_DEFAULT
	msgbox Nulltown_ThornsLab_Text_ThornIntro2, MSGBOX_DEFAULT
	msgbox Nulltown_ThornsLab_Text_ThornIntro3, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_EventScript_ThornHasStarter::
	msgbox Nulltown_ThornsLab_Text_ThornHasStarter, MSGBOX_DEFAULT
	release
	end

@ After getting starter, Thorn gives Pokedex and Poke Balls
Nulltown_ThornsLab_EventScript_ThornGivePokedex::
	msgbox Nulltown_ThornsLab_Text_ThornPokedex1, MSGBOX_DEFAULT
	@ Give Pokedex
	setflag FLAG_SYS_POKEDEX_GET
	setflag FLAG_NULLTOWN_RECEIVED_POKEDEX
	special SetUnlockedPokedexFlags
	playfanfare MUS_OBTAIN_ITEM
	message Nulltown_ThornsLab_Text_ReceivedPokedex
	waitmessage
	waitfanfare
	@ Give 5 Poke Balls
	msgbox Nulltown_ThornsLab_Text_ThornPokedex2, MSGBOX_DEFAULT
	giveitem ITEM_POKE_BALL, 5
	setflag FLAG_NUZLOCKE_ACTIVE
	@ Nuzlocke warning
	msgbox Nulltown_ThornsLab_Text_ThornNuzlockeWarning, MSGBOX_DEFAULT
	setvar VAR_NULLTOWN_STATE, 3
	setflag FLAG_ADVENTURE_STARTED
	release
	end

Nulltown_ThornsLab_EventScript_ThornPostPokedex::
	msgbox Nulltown_ThornsLab_Text_ThornPostPokedex, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_Text_ThornIntro1:
	.string "PROF. THORN: You must be the new\n"
	.string "arrival. I’m PROFESSOR THORN.\p"
	.string "Yes, I’m a DECIDUEYE. No, I will\n"
	.string "not be addressing that further.\p"
	.string "I have a lab coat and three\n"
	.string "PHDs. Two of them are real.$"

Nulltown_ThornsLab_Text_ThornIntro2:
	.string "PROF. THORN: I study RESONANCE\n"
	.string "ENERGY -- the bond between humans\l"
	.string "and POKeMON made manifest as power.\p"
	.string "The entire region runs on it.\n"
	.string "Literally. The lights. The\l"
	.string "hospitals. Everything.\p"
	.string "Nobody asks where the energy\n"
	.string "goes when one of them dies.\p"
	.string "I ask.\n"
	.string "They stopped inviting me to\l"
	.string "conferences.$"

Nulltown_ThornsLab_Text_ThornIntro3:
	.string "PROF. THORN: I have three POKeMON\n"
	.string "here that need trainers.\p"
	.string "Not because you are special.\n"
	.string "The last three candidates quit.\l"
	.string "One of them is missing.\p"
	.string "Choose one from the POKe BALLS on\n"
	.string "the table.$"

Nulltown_ThornsLab_Text_ThornHasStarter:
	.string "PROF. THORN: You’ve made your\n"
	.string "choice. Come talk to me again\l"
	.string "and I’ll give you something useful\l"
	.string "for your journey.$"

Nulltown_ThornsLab_Text_ThornPokedex1:
	.string "PROF. THORN: Good. You have a\n"
	.string "POKeMON. Now you need purpose.\p"
	.string "Take this POKeDEX. It documents\n"
	.string "what you find out there.\p"
	.string "It also documents you.\n"
	.string "Ignore that feature.$"

Nulltown_ThornsLab_Text_ReceivedPokedex:
	.string "{PLAYER} received the POKeDEX!$"

Nulltown_ThornsLab_Text_ThornPokedex2:
	.string "PROF. THORN: And take these.\n"
	.string "Empty POKe BALLS.\p"
	.string "For catching. Not for throwing\n"
	.string "at people.\p"
	.string "I have to say that now.\n"
	.string "There was an incident.$"

Nulltown_ThornsLab_Text_ThornNuzlockeWarning:
	.string "PROF. THORN: One more thing.\p"
	.string "In ABSURDIA, when a POKeMON\n"
	.string "faints ... it does not always\l"
	.string "come back.\p"
	.string "I have lost colleagues to this.\p"
	.string "The BUREAU says it is natural.\n"
	.string "I am keeping a list of names.\p"
	.string "Be careful with the lives\n"
	.string "entrusted to you.$"

Nulltown_ThornsLab_Text_ThornPostPokedex:
	.string "PROF. THORN: You are still here.\p"
	.string "Most people leave after the\n"
	.string "part about irreversible death.\p"
	.string "I respect the commitment.\n"
	.string "Or I question the judgment.\p"
	.string "Go. Document everything.\n"
	.string "Trust nothing that is branded.$"

@ ========================
@ Starter Ball 1 - CYNDAQUIL (Fire)
@ ========================

Nulltown_ThornsLab_EventScript_StarterBall1::
	lock
	goto_if_set FLAG_NULLTOWN_RECEIVED_STARTER, Nulltown_ThornsLab_EventScript_BonusBall1
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterRight
	waitmovement 0
	showmonpic SPECIES_CYNDAQUIL, 10, 3
	msgbox Nulltown_ThornsLab_Text_StarterBall1, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_DontChoose
	goto Nulltown_ThornsLab_EventScript_GiveCyndaquil
	end

Nulltown_ThornsLab_EventScript_BonusBall1::
	showmonpic SPECIES_CYNDAQUIL, 10, 3
	msgbox Nulltown_ThornsLab_Text_BonusBallCyndaquil, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusDontTake
	setvar VAR_0x8007, 5
	setvar VAR_0x8008, 8
	goto_if_set FLAG_NULLTOWN_TOOK_BONUS_STARTER, Nulltown_ThornsLab_EventScript_ThirdStarterCaught
	goto Nulltown_ThornsLab_EventScript_BonusGiveCyndaquil
	end

Nulltown_ThornsLab_EventScript_BonusGiveCyndaquil::
	bufferspeciesname STR_VAR_1, SPECIES_CYNDAQUIL
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_CYNDAQUIL
	givemon SPECIES_CYNDAQUIL, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_BonusCyndaquilToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_BonusCyndaquilToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_BonusCyndaquilToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_1
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusFinish
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_BonusFinish
	end

Nulltown_ThornsLab_EventScript_BonusCyndaquilToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_1
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_BonusToPC
	end

Nulltown_ThornsLab_EventScript_GiveCyndaquil::
	bufferspeciesname STR_VAR_1, SPECIES_CYNDAQUIL
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_CYNDAQUIL
	givemon SPECIES_CYNDAQUIL, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_CyndaquilToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_CyndaquilToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_CyndaquilToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_1
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_FinishStarter
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_FinishStarter
	end

Nulltown_ThornsLab_EventScript_CyndaquilToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_1
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_StarterToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_StarterToPC
	end

@ ========================
@ Starter Ball 2 - TOTODILE (Water)
@ ========================

Nulltown_ThornsLab_EventScript_StarterBall2::
	lock
	goto_if_set FLAG_NULLTOWN_RECEIVED_STARTER, Nulltown_ThornsLab_EventScript_BonusBall2
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterRight
	waitmovement 0
	showmonpic SPECIES_TOTODILE, 10, 3
	msgbox Nulltown_ThornsLab_Text_StarterBall2, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_DontChoose
	goto Nulltown_ThornsLab_EventScript_GiveTotodile
	end

Nulltown_ThornsLab_EventScript_BonusBall2::
	showmonpic SPECIES_TOTODILE, 10, 3
	msgbox Nulltown_ThornsLab_Text_BonusBallTotodile, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusDontTake
	setvar VAR_0x8007, 6
	setvar VAR_0x8008, 8
	goto_if_set FLAG_NULLTOWN_TOOK_BONUS_STARTER, Nulltown_ThornsLab_EventScript_ThirdStarterCaught
	goto Nulltown_ThornsLab_EventScript_BonusGiveTotodile
	end

Nulltown_ThornsLab_EventScript_BonusGiveTotodile::
	bufferspeciesname STR_VAR_1, SPECIES_TOTODILE
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_TOTODILE
	givemon SPECIES_TOTODILE, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_BonusTotodileToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_BonusTotodileToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_BonusTotodileToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_2
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusFinish
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_BonusFinish
	end

Nulltown_ThornsLab_EventScript_BonusTotodileToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_2
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_BonusToPC
	end

Nulltown_ThornsLab_EventScript_GiveTotodile::
	bufferspeciesname STR_VAR_1, SPECIES_TOTODILE
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_TOTODILE
	givemon SPECIES_TOTODILE, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_TotodileToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_TotodileToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_TotodileToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_2
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_FinishStarter
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_FinishStarter
	end

Nulltown_ThornsLab_EventScript_TotodileToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_2
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_StarterToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_StarterToPC
	end

@ ========================
@ Starter Ball 3 - CHIKORITA (Grass)
@ ========================

Nulltown_ThornsLab_EventScript_StarterBall3::
	lock
	goto_if_set FLAG_NULLTOWN_RECEIVED_STARTER, Nulltown_ThornsLab_EventScript_BonusBall3
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterRight
	waitmovement 0
	showmonpic SPECIES_CHIKORITA, 10, 3
	msgbox Nulltown_ThornsLab_Text_StarterBall3, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_DontChoose
	goto Nulltown_ThornsLab_EventScript_GiveChikorita
	end

Nulltown_ThornsLab_EventScript_BonusBall3::
	showmonpic SPECIES_CHIKORITA, 10, 3
	msgbox Nulltown_ThornsLab_Text_BonusBallChikorita, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusDontTake
	setvar VAR_0x8007, 7
	setvar VAR_0x8008, 8
	goto_if_set FLAG_NULLTOWN_TOOK_BONUS_STARTER, Nulltown_ThornsLab_EventScript_ThirdStarterCaught
	goto Nulltown_ThornsLab_EventScript_BonusGiveChikorita
	end

Nulltown_ThornsLab_EventScript_BonusGiveChikorita::
	bufferspeciesname STR_VAR_1, SPECIES_CHIKORITA
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_CHIKORITA
	givemon SPECIES_CHIKORITA, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_BonusChikoritaToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_BonusChikoritaToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_BonusChikoritaToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_3
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusFinish
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_BonusFinish
	end

Nulltown_ThornsLab_EventScript_BonusChikoritaToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_3
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_BonusToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_BonusToPC
	end

Nulltown_ThornsLab_EventScript_GiveChikorita::
	bufferspeciesname STR_VAR_1, SPECIES_CHIKORITA
	setvar VAR_TEMP_TRANSFERRED_SPECIES, SPECIES_CHIKORITA
	givemon SPECIES_CHIKORITA, 5
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PARTY, Nulltown_ThornsLab_EventScript_ChikoritaToParty
	goto_if_eq VAR_RESULT, MON_GIVEN_TO_PC, Nulltown_ThornsLab_EventScript_ChikoritaToPC
	hidemonpic
	goto Common_EventScript_NoMoreRoomForPokemon
	end

Nulltown_ThornsLab_EventScript_ChikoritaToParty::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_3
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_FinishStarter
	call Common_EventScript_GetGiftMonPartySlot
	call Common_EventScript_NameReceivedPartyMon
	goto Nulltown_ThornsLab_EventScript_FinishStarter
	end

Nulltown_ThornsLab_EventScript_ChikoritaToPC::
	call Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare
	removeobject LOCALID_THORNS_LAB_BALL_3
	msgbox gText_NicknameThisPokemon, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Nulltown_ThornsLab_EventScript_StarterToPC
	call Common_EventScript_NameReceivedBoxMon
	goto Nulltown_ThornsLab_EventScript_StarterToPC
	end

@ ========================
@ Shared starter helper scripts
@ ========================

Nulltown_ThornsLab_EventScript_ReceivedStarterFanfare::
	playfanfare MUS_OBTAIN_ITEM
	message Nulltown_ThornsLab_Text_ReceivedStarter
	waitmessage
	waitfanfare
	setflag FLAG_SYS_POKEMON_GET
	return

Nulltown_ThornsLab_EventScript_FinishStarter::
	hidemonpic
	msgbox Nulltown_ThornsLab_Text_ThornAfterChoice, MSGBOX_DEFAULT
	setflag FLAG_NULLTOWN_RECEIVED_STARTER
	setvar VAR_NULLTOWN_STATE, 2
	release
	end

Nulltown_ThornsLab_EventScript_StarterToPC::
	call Common_EventScript_TransferredToPC
	goto Nulltown_ThornsLab_EventScript_FinishStarter
	end

Nulltown_ThornsLab_EventScript_DontChoose::
	hidemonpic
	msgbox Nulltown_ThornsLab_Text_TakeYourTime, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_EventScript_BonusDontTake::
	hidemonpic
	msgbox Nulltown_ThornsLab_Text_BonusDontTake, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_EventScript_BonusFinish::
	hidemonpic
	setflag FLAG_NULLTOWN_TOOK_BONUS_STARTER
	msgbox Nulltown_ThornsLab_Text_BonusNobodyNoticed, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_EventScript_BonusToPC::
	call Common_EventScript_TransferredToPC
	goto Nulltown_ThornsLab_EventScript_BonusFinish
	end

@ ========================
@ Third Starter Punishment
@ ========================

Nulltown_ThornsLab_EventScript_ThirdStarterCaught::
	hidemonpic
	@ Freeze: ominous pause
	msgbox Nulltown_ThornsLab_Text_Caught_Freeze, MSGBOX_DEFAULT
	@ VAR_0x8007/8008 = ball x/y (set by BonusBall scripts)
	@ VAR_0x8004/8005 = player x/y
	getplayerxy VAR_0x8004, VAR_0x8005
	@ Compare player pos to ball pos to find which side player is on
	@ Then place Thorn on the OPPOSITE side (behind player)
	@ Check Y first (north/south of ball)
	compare VAR_0x8005, VAR_0x8008
	goto_if_gt Nulltown_ThornsLab_EventScript_CaughtPlayerSouth
	goto_if_lt Nulltown_ThornsLab_EventScript_CaughtPlayerNorth
	@ Same Y row — check X (east/west of ball)
	compare VAR_0x8004, VAR_0x8007
	goto_if_gt Nulltown_ThornsLab_EventScript_CaughtPlayerEast
	goto Nulltown_ThornsLab_EventScript_CaughtPlayerWest
	end

@ Player is south of ball (py > by) — Thorn goes further south (py+1)
Nulltown_ThornsLab_EventScript_CaughtPlayerSouth::
	addvar VAR_0x8005, 1
	setobjectxy LOCALID_THORNS_LAB_THORN, VAR_0x8004, VAR_0x8005
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterUp
	waitmovement 0
	goto Nulltown_ThornsLab_EventScript_CaughtBreathing
	end

@ Player is north of ball (py < by) — Thorn goes further north (py-1)
Nulltown_ThornsLab_EventScript_CaughtPlayerNorth::
	subvar VAR_0x8005, 1
	setobjectxy LOCALID_THORNS_LAB_THORN, VAR_0x8004, VAR_0x8005
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterDown
	waitmovement 0
	goto Nulltown_ThornsLab_EventScript_CaughtBreathing
	end

@ Player is east of ball (px > bx) — Thorn goes further east (px+1)
Nulltown_ThornsLab_EventScript_CaughtPlayerEast::
	addvar VAR_0x8004, 1
	setobjectxy LOCALID_THORNS_LAB_THORN, VAR_0x8004, VAR_0x8005
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterLeft
	waitmovement 0
	goto Nulltown_ThornsLab_EventScript_CaughtBreathing
	end

@ Player is west of ball (px < bx) — Thorn goes further west (px-1)
Nulltown_ThornsLab_EventScript_CaughtPlayerWest::
	subvar VAR_0x8004, 1
	setobjectxy LOCALID_THORNS_LAB_THORN, VAR_0x8004, VAR_0x8005
	applymovement LOCALID_THORNS_LAB_THORN, Common_Movement_WalkInPlaceFasterRight
	waitmovement 0
	goto Nulltown_ThornsLab_EventScript_CaughtBreathing
	end

Nulltown_ThornsLab_EventScript_CaughtBreathing::
	@ The breathing
	playse SE_PIN
	msgbox Nulltown_ThornsLab_Text_Caught_Breathing, MSGBOX_DEFAULT
	@ Player turns around to face Thorn (toward the ball = away from Thorn)
	@ Recompute: compare player to ball again to determine turn direction
	getplayerxy VAR_0x8004, VAR_0x8005
	compare VAR_0x8005, VAR_0x8008
	goto_if_gt Nulltown_ThornsLab_EventScript_TurnPlayerS
	goto_if_lt Nulltown_ThornsLab_EventScript_TurnPlayerN
	compare VAR_0x8004, VAR_0x8007
	goto_if_gt Nulltown_ThornsLab_EventScript_TurnPlayerE
	goto Nulltown_ThornsLab_EventScript_TurnPlayerW
	end

@ Player south of ball → Thorn is further south → turn south
Nulltown_ThornsLab_EventScript_TurnPlayerS::
	turnobject LOCALID_PLAYER, DIR_SOUTH
	goto Nulltown_ThornsLab_EventScript_CaughtSpeech
	end

@ Player north of ball → Thorn is further north → turn north
Nulltown_ThornsLab_EventScript_TurnPlayerN::
	turnobject LOCALID_PLAYER, DIR_NORTH
	goto Nulltown_ThornsLab_EventScript_CaughtSpeech
	end

@ Player east of ball → Thorn is further east → turn east
Nulltown_ThornsLab_EventScript_TurnPlayerE::
	turnobject LOCALID_PLAYER, DIR_EAST
	goto Nulltown_ThornsLab_EventScript_CaughtSpeech
	end

@ Player west of ball → Thorn is further west → turn west
Nulltown_ThornsLab_EventScript_TurnPlayerW::
	turnobject LOCALID_PLAYER, DIR_WEST
	goto Nulltown_ThornsLab_EventScript_CaughtSpeech
	end

Nulltown_ThornsLab_EventScript_CaughtSpeech::
	msgbox Nulltown_ThornsLab_Text_Caught_Thorn1, MSGBOX_DEFAULT
	msgbox Nulltown_ThornsLab_Text_Caught_Thorn2, MSGBOX_DEFAULT
	@ Knockout
	playse SE_BANG
	msgbox Nulltown_ThornsLab_Text_Caught_Dark, MSGBOX_DEFAULT
	fadescreen FADE_TO_BLACK
	special ZeroPlayerPartyMons
	setvar VAR_NULLTOWN_STATE, 0
	setvar VAR_LOST_CLEARING_STATE, 0
	clearflag FLAG_NULLTOWN_RECEIVED_STARTER
	clearflag FLAG_NULLTOWN_TOOK_BONUS_STARTER
	clearflag FLAG_SYS_POKEMON_GET
	warp MAP_LOST_CLEARING, 5, 5
	waitstate
	releaseall
	end

Nulltown_ThornsLab_Text_Caught_Freeze:
	.string "You reach for the POKe BALL.\p"
	.string "Your hand stops.\p"
	.string "Not because you stopped it.$"

Nulltown_ThornsLab_Text_Caught_Breathing:
	.string "Something warm on the back of\n"
	.string "your neck.\p"
	.string "Breathing.\p"
	.string "Slow. Deliberate.\n"
	.string "Feathery.$"

Nulltown_ThornsLab_Text_Caught_Thorn1:
	.string "PROF. THORN: ...hey.\p"
	.string "PROF. THORN: What are we\n"
	.string "doing right now.\p"
	.string "PROF. THORN: I let you take\n"
	.string "two. TWO. That was me being\l"
	.string "generous fr.$"

Nulltown_ThornsLab_Text_Caught_Thorn2:
	.string "PROF. THORN: You thought I was\n"
	.string "reading?\p"
	.string "Bestie.\p"
	.string "I was watching the ENTIRE time.\p"
	.string "You are cooked.$"

Nulltown_ThornsLab_Text_Caught_Dark:
	.string "A talon taps your shoulder.\p"
	.string "...\p"
	.string "Everything goes dark.$"

Nulltown_ThornsLab_Text_StarterBall1:
	.string "A POKe BALL sits on a hay bale\n"
	.string "stand. A label reads: “FIRE TYPE.”\p"
	.string "It contains CYNDAQUIL.\n"
	.string "Choose this POKeMON?$"

Nulltown_ThornsLab_Text_StarterBall2:
	.string "A POKe BALL sits on a hay bale\n"
	.string "stand. A label reads: “WATER TYPE.”\p"
	.string "It contains TOTODILE.\n"
	.string "Choose this POKeMON?$"

Nulltown_ThornsLab_Text_StarterBall3:
	.string "A POKe BALL sits on a hay bale\n"
	.string "stand. A label reads: “GRASS TYPE.”\p"
	.string "It contains CHIKORITA.\n"
	.string "Choose this POKeMON?$"

Nulltown_ThornsLab_Text_ReceivedStarter:
	.string "{PLAYER} received {STR_VAR_1}!$"

Nulltown_ThornsLab_Text_ThornAfterChoice:
	.string "PROF. THORN: Statistics suggest\n"
	.string "it will not matter much.\p"
	.string "But people enjoy the illusion\n"
	.string "of agency.\p"
	.string "Come speak to me again. I have\n"
	.string "equipment for your journey.$"

Nulltown_ThornsLab_Text_TakeYourTime:
	.string "PROF. THORN: Take your time.\n"
	.string "They have been sitting there\l"
	.string "for months.\p"
	.string "One of them has started making\n"
	.string "noises at night.\p"
	.string "Not relevant. Take your time.$"

Nulltown_ThornsLab_Text_BonusBallCyndaquil:
	.string "The CYNDAQUIL is still here.\n"
	.string "Just... sitting in its ball.\p"
	.string "Nobody is watching.\n"
	.string "PROF. THORN is facing the wall.\l"
	.string "The AIDE is looking at a bookshelf.\p"
	.string "Take CYNDAQUIL?$"

Nulltown_ThornsLab_Text_BonusBallTotodile:
	.string "The TOTODILE is still here.\n"
	.string "It looks bored.\p"
	.string "Nobody has come to claim it.\n"
	.string "Nobody is paying attention to\l"
	.string "you right now.\p"
	.string "Take TOTODILE?$"

Nulltown_ThornsLab_Text_BonusBallChikorita:
	.string "The CHIKORITA is still here.\n"
	.string "It has been here for months.\p"
	.string "It makes a small hopeful noise\n"
	.string "when it senses you nearby.\p"
	.string "Nobody would even notice.\n"
	.string "Take CHIKORITA?$"

Nulltown_ThornsLab_Text_BonusDontTake:
	.string "You decided to leave it.\p"
	.string "It would have been so easy.\n"
	.string "Nobody was looking.$"

Nulltown_ThornsLab_Text_BonusNobodyNoticed:
	.string "...\p"
	.string "Nobody noticed.\p"
	.string "PROF. THORN is still reading.\n"
	.string "The AIDE is still pacing.\p"
	.string "You just walked out with a\n"
	.string "whole POKéMON and nobody\l"
	.string "said a single word.\p"
	.string "This feels too easy.\p"
	.string "It was.$"

@ ========================
@ Lab Aide
@ ========================

Nulltown_ThornsLab_EventScript_Aide::
	lock
	faceplayer
	goto_if_set FLAG_NULLTOWN_RECEIVED_STARTER, Nulltown_ThornsLab_EventScript_AidePostStarter
	msgbox Nulltown_ThornsLab_Text_Aide, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_EventScript_AidePostStarter::
	msgbox Nulltown_ThornsLab_Text_AidePostStarter, MSGBOX_DEFAULT
	release
	end

Nulltown_ThornsLab_Text_Aide:
	.string "I’m PROFESSOR THORN’s research\n"
	.string "assistant.\p"
	.string "Yes, my boss is a POKeMON.\n"
	.string "No, I don’t want to talk about\l"
	.string "the power dynamics of that.\p"
	.string "They’re a brilliant researcher.\n"
	.string "The lab coat is self-appointed.$"

Nulltown_ThornsLab_Text_AidePostStarter:
	.string "The PROFESSOR does not give\n"
	.string "starters to just anyone.\p"
	.string "Well, actually, they do.\n"
	.string "To literally anyone who walks in.\p"
	.string "We have been trying to get rid of\n"
	.string "those three for months.\p"
	.string "The CHIKORITA bit someone.$"

@ ========================
@ Bookshelves
@ ========================

Nulltown_ThornsLab_EventScript_Bookshelf::
	msgbox Nulltown_ThornsLab_Text_Bookshelf, MSGBOX_SIGN
	end

Nulltown_ThornsLab_Text_Bookshelf:
	.string "Half POKeMON research papers, half\n"
	.string "DR. LUMEN’s personal library.\p"
	.string "Titles include: “RESONANCE THEORY\n"
	.string "VOL. 3,“ ”BOND ENERGY DYNAMICS,“\l"
	.string "and “COOKING FOR ONE (POKeMON\l"
	.string "EDITION).“$"

@ ========================
@ Framed Photo
@ ========================

Nulltown_ThornsLab_EventScript_Photo::
	msgbox Nulltown_ThornsLab_Text_Photo, MSGBOX_SIGN
	end

Nulltown_ThornsLab_Text_Photo:
	.string "A framed photograph: a woman\n"
	.string "standing next to a DARTRIX.\p"
	.string "Both are smiling. The frame is\n"
	.string "worn from being held.\p"
	.string "A small plaque reads:\n"
	.string "“DR. LUMEN & THORN -- YEAR ONE.”$"

@ ========================
@ Translation Device Charger
@ ========================

Nulltown_ThornsLab_EventScript_TranslationCharger::
	msgbox Nulltown_ThornsLab_Text_TranslationCharger, MSGBOX_SIGN
	end

Nulltown_ThornsLab_Text_TranslationCharger:
	.string "A charging station for PROFESSOR\n"
	.string "THORN’s translation device.\p"
	.string "A sticky note reads: “CHARGE ME\n"
	.string "OVERNIGHT OR I SOUND LIKE A BROKEN\l"
	.string "RADIO AGAIN -- T“$"
