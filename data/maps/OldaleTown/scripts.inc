@ Ferro City (OldaleTown) scripts
@ Industrial city, first gym (Steel-type, Leader Anvil)
@ Bureau presence, Quin rival battle 2

OldaleTown_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, OldaleTown_OnTransition
	.byte 0

OldaleTown_OnTransition:
	setflag FLAG_VISITED_OLDALE_TOWN
	end

@ Pokemon Gym warp is at RustboroCity_Gym. Quin stands near center.
@ North exit leads to Route103 (Underlake approach).
@ Bureau Guard blocks north until badge.

@ === NPCs ===

OldaleTown_EventScript_FactoryWorker::
	msgbox OldaleTown_Text_FactoryWorker, MSGBOX_NPC
	end

OldaleTown_EventScript_OldWoman::
	lock
	faceplayer
	goto_if_set FLAG_FERRO_DEFEATED_ANVIL, OldaleTown_EventScript_OldWomanPostGym
	msgbox OldaleTown_Text_OldWoman, MSGBOX_DEFAULT
	release
	end

OldaleTown_EventScript_OldWomanPostGym::
	msgbox OldaleTown_Text_OldWomanPostGym, MSGBOX_DEFAULT
	release
	end

OldaleTown_EventScript_KidNearGym::
	msgbox OldaleTown_Text_KidNearGym, MSGBOX_NPC
	end

OldaleTown_EventScript_BureauGuard::
	lock
	faceplayer
	goto_if_set FLAG_FERRO_DEFEATED_ANVIL, OldaleTown_EventScript_BureauGuardPostBadge
	msgbox OldaleTown_Text_BureauGuard, MSGBOX_DEFAULT
	release
	end

OldaleTown_EventScript_BureauGuardPostBadge::
	msgbox OldaleTown_Text_BureauGuardPostBadge, MSGBOX_DEFAULT
	release
	end

OldaleTown_EventScript_BureauEmployee::
	msgbox OldaleTown_Text_BureauEmployee, MSGBOX_NPC
	end

@ === QUIN RIVAL BATTLE 2 ===

OldaleTown_EventScript_QuinRival::
	lock
	faceplayer
	goto_if_set FLAG_FERRO_DEFEATED_QUIN_2, OldaleTown_EventScript_QuinPostBattle
	msgbox OldaleTown_Text_QuinPreBattle, MSGBOX_DEFAULT
	@ Pick the right Quin team based on player starter choice
	goto_if_eq VAR_NULLTOWN_STARTER_CHOICE, 1, OldaleTown_EventScript_QuinBattleWater
	goto_if_eq VAR_NULLTOWN_STARTER_CHOICE, 2, OldaleTown_EventScript_QuinBattleGrass
	@ Default: player chose grass (3), Quin has fire
	trainerbattle_no_intro TRAINER_QUIN_FERRO_FIRE, OldaleTown_Text_QuinDefeat
	goto OldaleTown_EventScript_QuinAfterBattle
	end

OldaleTown_EventScript_QuinBattleWater::
	trainerbattle_no_intro TRAINER_QUIN_FERRO_WATER, OldaleTown_Text_QuinDefeat
	goto OldaleTown_EventScript_QuinAfterBattle
	end

OldaleTown_EventScript_QuinBattleGrass::
	trainerbattle_no_intro TRAINER_QUIN_FERRO_GRASS, OldaleTown_Text_QuinDefeat
	goto OldaleTown_EventScript_QuinAfterBattle
	end

OldaleTown_EventScript_QuinAfterBattle::
	setflag FLAG_FERRO_DEFEATED_QUIN_2
	msgbox OldaleTown_Text_QuinPostBattle, MSGBOX_DEFAULT
	closemessage
	applymovement LOCALID_FERRO_QUIN, OldaleTown_Movement_QuinExit
	waitmovement 0
	setflag FLAG_HIDE_FERRO_QUIN
	removeobject LOCALID_FERRO_QUIN
	release
	end

OldaleTown_EventScript_QuinPostBattle::
	msgbox OldaleTown_Text_QuinPostBattle, MSGBOX_DEFAULT
	release
	end

OldaleTown_Movement_QuinExit:
	walk_down
	walk_down
	walk_down
	walk_down
	step_end

@ === SIGNS ===

OldaleTown_EventScript_TownSign::
	msgbox OldaleTown_Text_TownSign, MSGBOX_SIGN
	end

@ === TEXT ===

OldaleTown_Text_FactoryWorker:
	.string "The STEEL MILL processes raw RESONANCE\n"
	.string "ENERGY into power for the whole region.\p"
	.string "I pull levers there. Big ones.\n"
	.string "Sometimes small ones.\p"
	.string "I do not understand how any of it\n"
	.string "works. The levers seem important.$"

OldaleTown_Text_OldWoman:
	.string "MAYOR ANVIL runs the city AND the GYM.\p"
	.string "He used to be so energetic. Lately\n"
	.string "he just stares at budget reports and\l"
	.string "makes this sound. Like a tea kettle.\p"
	.string "He is a good man. Tired man.$"

OldaleTown_Text_OldWomanPostGym:
	.string "You beat ANVIL? Good.\n"
	.string "Maybe now he will actually sleep.\p"
	.string "Here, take this. He would forget\n"
	.string "to eat if I did not bring him food.$"

OldaleTown_Text_KidNearGym:
	.string "The GYM is in the next town over,\n"
	.string "through RUSTBORO way!\p"
	.string "MAYOR ANVIL’s GYM is so cool!\n"
	.string "You redirect power conduits to open\l"
	.string "doors!\p"
	.string "Last challenger redirected power to\n"
	.string "the hospital wing by accident and it\l"
	.string "was the most electricity they had\l"
	.string "had in weeks!$"

OldaleTown_Text_BureauGuard:
	.string "This is a RESTRICTED AREA.\n"
	.string "RESONANCE ENERGY CORP personnel only.\p"
	.string "Unless you have a BADGE.\n"
	.string "Badges override everything here.\p"
	.string "Do not ask why.$"

OldaleTown_Text_BureauGuardPostBadge:
	.string "You have the FORGE BADGE.\n"
	.string "LEVEL 1 clearance confirmed.\p"
	.string "Proceed. The STEEL MILL is north.\n"
	.string "Try not to touch anything that hums.$"

OldaleTown_Text_BureauEmployee:
	.string "Just taking readings! Routine survey.\n"
	.string "Nothing to worry about.\p"
	.string "How are your POKéMON feeling?\n"
	.string "Emotionally, I mean.\l"
	.string "On a scale of 1 to 10.\p"
	.string "No reason. Just data.$"

OldaleTown_Text_QuinPreBattle:
	.string "QUIN: There you are! I have been\n"
	.string "WAITING!\p"
	.string "I already scoped out the GYM and it\n"
	.string "is INCREDIBLE. Steel-type puzzles!\l"
	.string "Power conduits! Rating: eight out\l"
	.string "of ten!\p"
	.string "But first, REMATCH! I trained on\n"
	.string "ROUTE N-1. Those TUTORIAL NPCs?\l"
	.string "Some of them battle.\l"
	.string "The desperate ones.\p"
	.string "CONTENT TIME!$"

OldaleTown_Text_QuinDefeat:
	.string "Okay WOW. Still working on my\n"
	.string "team comp.$"

OldaleTown_Text_QuinPostBattle:
	.string "QUIN: The JOURNEY is what matters,\n"
	.string "not the DESTINATION.\p"
	.string "I read that on a sign somewhere.\n"
	.string "Might have been a TUTORIAL sign.\p"
	.string "Anyway I am heading to the GYM!\n"
	.string "Race you there!$"

OldaleTown_Text_TownSign:
	.string "FERRO CITY\n"
	.string "“Built on Steel.\l"
	.string "Powered by Feelings.”\p"
	.string "(This is not a metaphor.)$"
