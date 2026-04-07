Nulltown_PlayersHouse_1F_MapScripts::
	.byte 0

@ ========================
@ Block exit until player talks to Mom
@ ========================

Nulltown_PlayersHouse_1F_EventScript_DoorTrigger::
	lock
	goto_if_ge VAR_NULLTOWN_STATE, 1, Nulltown_PlayersHouse_1F_EventScript_DoorLetThrough
	setflag FLAG_NULLTOWN_BEEN_TO_DOOR
	msgbox Nulltown_PlayersHouse_1F_Text_DoorStopsYou, MSGBOX_DEFAULT
	applymovement OBJ_EVENT_ID_PLAYER, Nulltown_PlayersHouse_1F_Movement_StepBack
	waitmovement 0
	release
	end

Nulltown_PlayersHouse_1F_EventScript_DoorLetThrough::
	release
	end

Nulltown_PlayersHouse_1F_Text_DoorStopsYou:
	.string "You should probably say goodbye\n"
	.string "to your MOM before you leave.\p"
	.string "She seems like she wants to\n"
	.string "talk to you.$"

Nulltown_PlayersHouse_1F_Movement_StepBack:
	walk_up
	step_end

@ ========================
@ Mom - 1F
@ ========================

Nulltown_PlayersHouse_1F_EventScript_Mom::
	lock
	faceplayer
	goto_if_ge VAR_NULLTOWN_STATE, 2, Nulltown_PlayersHouse_1F_EventScript_MomPostStarter
	goto_if_ge VAR_NULLTOWN_STATE, 1, Nulltown_PlayersHouse_1F_EventScript_MomAlreadyTalked
	goto_if_set FLAG_NULLTOWN_BEEN_TO_DOOR, Nulltown_PlayersHouse_1F_EventScript_MomDadStory
	@ Player came straight to Mom without trying the door first
	msgbox Nulltown_PlayersHouse_1F_Text_MomBusy, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_EventScript_MomDadStory::
	msgbox Nulltown_PlayersHouse_1F_Text_MomIntro, MSGBOX_DEFAULT
	setvar VAR_NULLTOWN_STATE, 1
	release
	end

Nulltown_PlayersHouse_1F_EventScript_MomAlreadyTalked::
	goto_if_set FLAG_NULLTOWN_MET_QUIN, Nulltown_PlayersHouse_1F_EventScript_MomAfterQuin
	msgbox Nulltown_PlayersHouse_1F_Text_MomReminder, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_EventScript_MomAfterQuin::
	msgbox Nulltown_PlayersHouse_1F_Text_Mom, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_EventScript_MomPostStarter::
	msgbox Nulltown_PlayersHouse_1F_Text_MomHealOffer, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, YES, Nulltown_PlayersHouse_1F_EventScript_MomHeals
	msgbox Nulltown_PlayersHouse_1F_Text_MomDecline, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_EventScript_MomHeals::
	msgbox Nulltown_PlayersHouse_1F_Text_MomDisappointed, MSGBOX_DEFAULT
	closemessage
	call Common_EventScript_OutOfCenterPartyHeal
	incrementgamestat GAME_STAT_RESTED_AT_HOME
	msgbox Nulltown_PlayersHouse_1F_Text_MomAfterHeal, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_Text_MomBusy:
	.string "MOM: I am unpacking 47 boxes\n"
	.string "by myself. Can you not see that?\p"
	.string "Go outside. Introduce yourself\n"
	.string "to the neighbors. Touch grass.\l"
	.string "Literally anything but stand\l"
	.string "here watching me work.$"

Nulltown_PlayersHouse_1F_Text_MomIntro:
	.string "MOM: Did I just see the PROFESSOR\n"
	.string "come down from your room?\p"
	.string "No? Weird.\p"
	.string "Anyway. You had to be told by\n"
	.string "a DOOR to come say goodbye to\l"
	.string "your own MOTHER.\p"
	.string "Anyway. Your father already left\n"
	.string "for work at the RESONANCE ENERGY\l"
	.string "CORPORATION. On our first day here.\p"
	.string "Shocking. Truly unprecedented\n"
	.string "behavior from him.\p"
	.string "Why don't you go introduce yourself\n"
	.string "to the neighbors? I think there's\l"
	.string "a kid your age next door.\p"
	.string "Or don't. I'm unpacking. I have\n"
	.string "47 boxes and no will to live.$"

Nulltown_PlayersHouse_1F_Text_MomReminder:
	.string "MOM: Go. Outside. Neighbors.\n"
	.string "I am busy.$"

Nulltown_PlayersHouse_1F_Text_Mom:
	.string "MOM: The MOVING COMPANY's MACHOKE\n"
	.string "carried all our boxes in.\p"
	.string "I tipped them in POKeBLOCKS.\n"
	.string "They seemed insulted.\l"
	.string "I don't care.$"

Nulltown_PlayersHouse_1F_Text_MomHealOffer:
	.string "MOM: Oh. You came back.\p"
	.string "Do you need me to heal your\n"
	.string "POKéMON?$"

Nulltown_PlayersHouse_1F_Text_MomDecline:
	.string "MOM: Fine. Go get hurt again.\n"
	.string "See if I care.$"

Nulltown_PlayersHouse_1F_Text_MomDisappointed:
	.string "MOM: Unbelievable.\p"
	.string "You have been a trainer for\n"
	.string "what, five minutes?\p"
	.string "And you are already crawling\n"
	.string "back home to have your MOTHER\l"
	.string "heal your POKéMON.\p"
	.string "There is a free POKéMON CENTER\n"
	.string "in literally the next town.\p"
	.string "A NURSE will do it. For FREE.\n"
	.string "It is her ENTIRE JOB.\p"
	.string "But no. You came HOME.\n"
	.string "To ME. Your MOTHER.\p"
	.string "Your father left to go work at\n"
	.string "a soulless energy corporation\l"
	.string "before we finished unpacking.\p"
	.string "I have been assembling furniture\n"
	.string "ALONE for six hours.\p"
	.string "And YOU come in here with your\n"
	.string "fainted ZIGZAGOON or whatever\l"
	.string "and expect me to just drop\l"
	.string "everything.\p"
	.string "I had DREAMS, you know.\n"
	.string "I was going to be a COORDINATOR.\p"
	.string "But SURE. Let me heal your little\n"
	.string "team. AGAIN.\p"
	.string "Hold on.$"

Nulltown_PlayersHouse_1F_Text_MomAfterHeal:
	.string "MOM: There. They are healed.\p"
	.string "You are welcome, by the way.\n"
	.string "Since you were not going to\l"
	.string "say it.\p"
	.string "Oh and if you see any men coming\n"
	.string "through, just ignore them.\p"
	.string "Now get out of my house.\n"
	.string "I love you. Leave.$"

@ ========================
@ TV
@ ========================

Nulltown_PlayersHouse_1F_EventScript_TV::
	msgbox Nulltown_PlayersHouse_1F_Text_TV, MSGBOX_SIGN
	end

Nulltown_PlayersHouse_1F_Text_TV:
	.string "TV: “... and RESONANCE ENERGY stock\n"
	.string "is up 14%% this quarter.\p"
	.string "CEO DIRECTOR VOSS credits ‘increased\n"
	.string "regional engagement’ for the\l"
	.string "surge ...”$"

@ ========================
@ Vigoroth (Moving helper)
@ ========================

Nulltown_PlayersHouse_1F_EventScript_Vigoroth::
	lock
	faceplayer
	msgbox Nulltown_PlayersHouse_1F_Text_Vigoroth, MSGBOX_DEFAULT
	release
	end

Nulltown_PlayersHouse_1F_Text_Vigoroth:
	.string "The VIGOROTH is moving boxes with\n"
	.string "aggressive professionalism.$"
