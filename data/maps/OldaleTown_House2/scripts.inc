@ Old Woman's house in Ferro City
OldaleTown_House2_MapScripts::
	.byte 0

OldaleTown_House2_EventScript_Woman::
	lock
	faceplayer
	goto_if_set FLAG_FERRO_DEFEATED_ANVIL, OldaleTown_House2_EventScript_WomanPostGym
	msgbox OldaleTown_House2_Text_WomanPreGym, MSGBOX_DEFAULT
	release
	end

OldaleTown_House2_EventScript_WomanPostGym::
	msgbox OldaleTown_House2_Text_WomanPostGym, MSGBOX_DEFAULT
	giveitem ITEM_GREAT_BALL
	release
	end

OldaleTown_House2_EventScript_Man::
	msgbox OldaleTown_House2_Text_Man, MSGBOX_NPC
	end

OldaleTown_House2_Text_WomanPreGym:
	.string "I have lived in FERRO CITY for\n"
	.string "forty years. Before the BUREAU.\l"
	.string "Before the MILL.\p"
	.string "It used to be quiet here.\n"
	.string "Now the walls hum at night.\p"
	.string "ANVIL does his best. But the\n"
	.string "BUREAU asks more every quarter\l"
	.string "and gives less every year.$"

OldaleTown_House2_Text_WomanPostGym:
	.string "You beat ANVIL? You must be strong.\n"
	.string "Here, take this.\p"
	.string "ANVIL would want someone with your\n"
	.string "spirit to have it.$"

OldaleTown_House2_Text_Man:
	.string "The CONDUITS in this house glow\n"
	.string "brighter when we argue.\p"
	.string "I measured it. Scientifically.\n"
	.string "With a ruler and a bad attitude.\p"
	.string "The BUREAU sent a thank-you note.$"

