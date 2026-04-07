Nulltown_PlayersHouse_2F_MapScripts::
	map_script MAP_SCRIPT_ON_FRAME_TABLE, Nulltown_PlayersHouse_2F_OnFrame
	.byte 0

Nulltown_PlayersHouse_2F_OnFrame:
	map_script_2 VAR_LITTLEROOT_INTRO_STATE, 0, Nulltown_PlayersHouse_2F_EventScript_WakeUp
	.2byte 0

@ ========================
@ Wake up in bed - new game opening
@ ========================

Nulltown_PlayersHouse_2F_EventScript_WakeUp::
	lockall
	setflag FLAG_HIDE_MAP_NAME_POPUP
	checkplayergender
	call_if_eq VAR_RESULT, MALE, Nulltown_PlayersHouse_2F_EventScript_SetIntroMale
	call_if_eq VAR_RESULT, FEMALE, Nulltown_PlayersHouse_2F_EventScript_SetIntroFemale
	setrespawn HEAL_LOCATION_NULLTOWN_PLAYERS_HOUSE_2F
	applymovement OBJ_EVENT_ID_PLAYER, Nulltown_Movement_WakeUp
	waitmovement 0
	delay 30
	msgbox Nulltown_PlayersHouse_2F_Text_WakeUp1, MSGBOX_DEFAULT
	msgbox Nulltown_PlayersHouse_2F_Text_WakeUp2, MSGBOX_DEFAULT
	setvar VAR_LITTLEROOT_INTRO_STATE, 7
	setflag FLAG_HIDE_NULLTOWN_TRUCK
	releaseall
	end

Nulltown_PlayersHouse_2F_EventScript_SetIntroMale:
	setvar VAR_LITTLEROOT_HOUSES_STATE_BRENDAN, 1
	return

Nulltown_PlayersHouse_2F_EventScript_SetIntroFemale:
	setvar VAR_LITTLEROOT_HOUSES_STATE_MAY, 1
	return

Nulltown_Movement_WakeUp:
	delay_16
	delay_16
	delay_16
	delay_16
	face_left
	delay_16
	delay_16
	face_down
	step_end

Nulltown_PlayersHouse_2F_Text_WakeUp1:
	.string "...\p"
	.string "You open your eyes.\p"
	.string "For a moment, you don't remember\n"
	.string "where you are. Then it comes back.\p"
	.string "NULLTOWN. Your new home.\n"
	.string "You moved here yesterday.$"

Nulltown_PlayersHouse_2F_Text_WakeUp2:
	.string "From downstairs, you can hear\n"
	.string "your MOM unpacking boxes.\p"
	.string "And muttering.\p"
	.string "Mostly muttering.$"

@ ========================
@ POTION on desk
@ ========================

Nulltown_PlayersHouse_2F_EventScript_Potion::
	finditem ITEM_POTION
	end

@ ========================
@ PC
@ ========================

Nulltown_PlayersHouse_2F_EventScript_PC::
	msgbox Nulltown_PlayersHouse_2F_Text_PC, MSGBOX_SIGN
	end

Nulltown_PlayersHouse_2F_Text_PC:
	.string "Your PC. The internet here runs on\n"
	.string "RESONANCE ENERGY.\p"
	.string "The connection is ... emotional.$"

@ ========================
@ Bed
@ ========================

Nulltown_PlayersHouse_2F_EventScript_Bed::
	msgbox Nulltown_PlayersHouse_2F_Text_Bed, MSGBOX_SIGN
	end

Nulltown_PlayersHouse_2F_Text_Bed:
	.string "Your bed. You could sleep, but you\n"
	.string "just got here and have done nothing\l"
	.string "to be tired from.$"
