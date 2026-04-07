Nulltown_QuinsHouse_1F_MapScripts::
	.byte 0

@ ========================
@ Quin's Parent
@ ========================

Nulltown_QuinsHouse_1F_EventScript_Parent::
	lock
	faceplayer
	goto_if_ge VAR_NULLTOWN_STATE, 2, Nulltown_QuinsHouse_1F_EventScript_ParentPostStarter
	msgbox Nulltown_QuinsHouse_1F_Text_Parent, MSGBOX_DEFAULT
	release
	end

Nulltown_QuinsHouse_1F_EventScript_ParentPostStarter::
	msgbox Nulltown_QuinsHouse_1F_Text_ParentPostStarter, MSGBOX_DEFAULT
	release
	end

Nulltown_QuinsHouse_1F_Text_Parent:
	.string "QUIN’S PARENT: Oh! You must be the\n"
	.string "new neighbor!\p"
	.string "QUIN has been so excited to meet you.\n"
	.string "They’ve already planned a whole\l"
	.string "“content arc” around it.\p"
	.string "I don’t know what that means but\n"
	.string "they seem happy.$"

Nulltown_QuinsHouse_1F_Text_ParentPostStarter:
	.string "QUIN’S PARENT: QUIN ran out the\n"
	.string "door talking about engagement\l"
	.string "metrics and subscriber counts.\p"
	.string "They have seven followers.\n"
	.string "I’m six of them.$"
