LostClearing_MapScripts::
	map_script MAP_SCRIPT_ON_FRAME_TABLE, LostClearing_OnFrame
	.byte 0

LostClearing_OnFrame:
	map_script_2 VAR_LOST_CLEARING_STATE, 0, LostClearing_EventScript_WakeUp
	.2byte 0

LostClearing_EventScript_WakeUp::
	lockall
	msgbox LostClearing_Text_WakeUp1, MSGBOX_DEFAULT
	msgbox LostClearing_Text_WakeUp2, MSGBOX_DEFAULT
	setvar VAR_LOST_CLEARING_STATE, 1
	releaseall
	end

LostClearing_EventScript_Ground::
	msgbox LostClearing_Text_Ground, MSGBOX_SIGN
	end

LostClearing_Text_WakeUp1:
	.string "...\p"
	.string "You wake up on the ground.\p"
	.string "You have nothing. No POKeMON.\n"
	.string "No items. No shoes.\p"
	.string "Why no shoes.$"

LostClearing_Text_WakeUp2:
	.string "Just trees.\n"
	.string "In every direction.\p"
	.string "No paths. No sounds.\n"
	.string "No cell service.\p"
	.string "This is a you problem now.$"

LostClearing_Text_Ground:
	.string "It is ground.\n"
	.string "The ground does not care\l"
	.string "about your situation.$"
