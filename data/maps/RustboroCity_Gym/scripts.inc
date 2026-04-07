@ Ferro City Gym (RustboroCity_Gym) scripts
@ Steel-type gym. Leader: Anvil (Mayor).
@ Gym trainers: Dale (Marc slot), Portia (Tommy slot), Rivet (Josh slot)
@ Post-battle: Anvil conspiracy scene about the Bureau

RustboroCity_Gym_MapScripts::
	.byte 0

@ === ANVIL (gym leader) ===
@ Uses the Roxanne script label for map.json compatibility

RustboroCity_Gym_EventScript_Roxanne::
	trainerbattle_single TRAINER_ANVIL_1, RustboroCity_Gym_Text_AnvilIntro, RustboroCity_Gym_Text_AnvilDefeat, RustboroCity_Gym_EventScript_AnvilDefeated, NO_MUSIC
	goto_if_set FLAG_FERRO_ANVIL_POSTGAME, RustboroCity_Gym_EventScript_AnvilPostConvo
	goto RustboroCity_Gym_EventScript_AnvilPostBattleScene
	end

RustboroCity_Gym_EventScript_AnvilDefeated::
	message RustboroCity_Gym_Text_ReceivedForgeBadge
	waitmessage
	call Common_EventScript_PlayGymBadgeFanfare
	msgbox RustboroCity_Gym_Text_ForgeBadgeInfo, MSGBOX_DEFAULT
	setflag FLAG_DEFEATED_RUSTBORO_GYM
	setflag FLAG_BADGE01_GET
	setflag FLAG_FERRO_DEFEATED_ANVIL
	setvar VAR_FERRO_STATE, 2
	setvar VAR_0x8008, 1
	call Common_EventScript_SetGymTrainers
	goto RustboroCity_Gym_EventScript_GiveIronDefense
	end

RustboroCity_Gym_EventScript_GiveIronDefense::
	giveitem ITEM_TM_IRON_TAIL
	goto_if_eq VAR_RESULT, FALSE, Common_EventScript_ShowBagIsFull
	setflag FLAG_RECEIVED_TM_ROCK_TOMB
	msgbox RustboroCity_Gym_Text_ExplainTM, MSGBOX_DEFAULT
	goto RustboroCity_Gym_EventScript_AnvilPostBattleScene
	end

RustboroCity_Gym_EventScript_AnvilPostBattleScene::
	goto_if_set FLAG_FERRO_ANVIL_POSTGAME, RustboroCity_Gym_EventScript_AnvilPostConvo
	msgbox RustboroCity_Gym_Text_AnvilConspiracy1, MSGBOX_DEFAULT
	msgbox RustboroCity_Gym_Text_AnvilConspiracy2, MSGBOX_DEFAULT
	msgbox RustboroCity_Gym_Text_AnvilConspiracy3, MSGBOX_DEFAULT
	setflag FLAG_FERRO_ANVIL_POSTGAME
	setvar VAR_FERRO_STATE, 3
	release
	end

RustboroCity_Gym_EventScript_AnvilPostConvo::
	msgbox RustboroCity_Gym_Text_AnvilPostBattle, MSGBOX_DEFAULT
	release
	end

@ === GYM TRAINERS ===
@ Marc slot = Worker Dale (position 1,6)

RustboroCity_Gym_EventScript_Marc::
	trainerbattle_single TRAINER_FERRO_DALE, RustboroCity_Gym_Text_DaleIntro, RustboroCity_Gym_Text_DaleDefeat
	msgbox RustboroCity_Gym_Text_DalePostBattle, MSGBOX_AUTOCLOSE
	end

@ Tommy slot = Engineer Portia (position 3,9)

RustboroCity_Gym_EventScript_Tommy::
	trainerbattle_single TRAINER_FERRO_PORTIA, RustboroCity_Gym_Text_PortiaIntro, RustboroCity_Gym_Text_PortiaDefeat
	msgbox RustboroCity_Gym_Text_PortiaPostBattle, MSGBOX_AUTOCLOSE
	end

@ Josh slot = Worker Rivet (position 5,13)

RustboroCity_Gym_EventScript_Josh::
	trainerbattle_single TRAINER_FERRO_RIVET, RustboroCity_Gym_Text_RivetIntro, RustboroCity_Gym_Text_RivetDefeat
	msgbox RustboroCity_Gym_Text_RivetPostBattle, MSGBOX_AUTOCLOSE
	end

@ === GYM GUIDE ===

RustboroCity_Gym_EventScript_GymGuide::
	lock
	faceplayer
	goto_if_set FLAG_FERRO_DEFEATED_ANVIL, RustboroCity_Gym_EventScript_GymGuidePostVictory
	msgbox RustboroCity_Gym_Text_GymGuideAdvice, MSGBOX_DEFAULT
	release
	end

RustboroCity_Gym_EventScript_GymGuidePostVictory::
	msgbox RustboroCity_Gym_Text_GymGuidePostVictory, MSGBOX_DEFAULT
	release
	end

@ === GYM STATUES ===

RustboroCity_Gym_EventScript_LeftGymStatue::
	lockall
	goto_if_set FLAG_BADGE01_GET, RustboroCity_Gym_EventScript_GymStatueCertified
	goto RustboroCity_Gym_EventScript_GymStatue
	end

RustboroCity_Gym_EventScript_RightGymStatue::
	lockall
	goto_if_set FLAG_BADGE01_GET, RustboroCity_Gym_EventScript_GymStatueCertified
	goto RustboroCity_Gym_EventScript_GymStatue
	end

RustboroCity_Gym_EventScript_GymStatueCertified::
	msgbox RustboroCity_Gym_Text_GymStatueCertified, MSGBOX_DEFAULT
	releaseall
	end

RustboroCity_Gym_EventScript_GymStatue::
	msgbox RustboroCity_Gym_Text_GymStatue, MSGBOX_DEFAULT
	releaseall
	end

@ Stub for C code reference (field_control_avatar.c)
RustboroCity_Gym_EventScript_RegisterRoxanne::
	end

@ === TEXT ===

@ -- Gym Guide --

RustboroCity_Gym_Text_GymGuideAdvice:
	.string "Welcome to FERRO CITY GYM!\n"
	.string "Leader ANVIL specializes in\l"
	.string "STEEL-type POKéMON!\p"
	.string "The gym puzzle involves redirecting\n"
	.string "POWER CONDUITS to open doors.\p"
	.string "Just pull the switches in the right\n"
	.string "order.\p"
	.string "If the lights go out in town,\n"
	.string "that is unrelated. Probably.$"

RustboroCity_Gym_Text_GymGuidePostVictory:
	.string "You beat ANVIL! The FORGE BADGE\n"
	.string "is yours!\p"
	.string "Between you and me, he looked\n"
	.string "relieved. Like he needed someone\l"
	.string "to beat him so he could take a\l"
	.string "break.$"

@ -- Worker Dale --

RustboroCity_Gym_Text_DaleIntro:
	.string "I work at the STEEL MILL by day\n"
	.string "and train here by night!\p"
	.string "I have not seen daylight in a\n"
	.string "way that feels metaphorical!$"

RustboroCity_Gym_Text_DaleDefeat:
	.string "Your POKéMON fight with real spirit.$"

RustboroCity_Gym_Text_DalePostBattle:
	.string "The RESONANCE METERS in here are\n"
	.string "going wild.\p"
	.string "The BUREAU will be pleased.\n"
	.string "I should not have said that.$"

@ -- Engineer Portia --

RustboroCity_Gym_Text_PortiaIntro:
	.string "I designed this gym ’s puzzle\n"
	.string "system! It ’s a simplified version\l"
	.string "of the actual power grid!\p"
	.string "If you fail, nothing bad happens!\n"
	.string "Unlike the real one!$"

RustboroCity_Gym_Text_PortiaDefeat:
	.string "Good battle!$"

RustboroCity_Gym_Text_PortiaPostBattle:
	.string "MAYOR ANVIL used to be so energetic.\n"
	.string "Lately he just looks like the\l"
	.string "STEEL MILL is eating him alive.\p"
	.string "Anyway! Good luck!$"

@ -- Worker Rivet --

RustboroCity_Gym_Text_RivetIntro:
	.string "One more trainer between you and\n"
	.string "the boss.\p"
	.string "I have been doing double shifts\n"
	.string "at the MILL and triple shifts here.\p"
	.string "I do not know what sleep is\n"
	.string "anymore. Let ’s go!$"

RustboroCity_Gym_Text_RivetDefeat:
	.string "Finally. I can sit down.$"

RustboroCity_Gym_Text_RivetPostBattle:
	.string "ANVIL is tough. His POKéMON are\n"
	.string "tired but they fight like they\l"
	.string "have something to prove.\p"
	.string "Kind of like him, honestly.$"

@ -- Anvil (Gym Leader) --

RustboroCity_Gym_Text_AnvilIntro:
	.string "Oh. A challenger.\n"
	.string "Sorry. I was reviewing budget reports.\p"
	.string "I ’m ANVIL. Mayor. Gym Leader.\n"
	.string "Insomniac. Pick the title you like.\p"
	.string "The GYM BADGE is also a LEVEL 1\n"
	.string "SECURITY CLEARANCE for the RESONANCE\l"
	.string "ENERGY grid.\p"
	.string "Do not think about that too hard.\n"
	.string "I did not, and look at me.\p"
	.string "Let ’s battle. I could use something\n"
	.string "that makes sense for five minutes.$"

RustboroCity_Gym_Text_AnvilDefeat:
	.string "Good. That was good.\n"
	.string "I needed that.$"

RustboroCity_Gym_Text_ReceivedForgeBadge:
	.string "{PLAYER} received the FORGE BADGE\n"
	.string "from ANVIL.$"

RustboroCity_Gym_Text_ForgeBadgeInfo:
	.string "The FORGE BADGE. Wear it well.\p"
	.string "POKéMON up to level 30 will obey\n"
	.string "you, and you now have LEVEL 1\l"
	.string "ACCESS to RESONANCE ENERGY\l"
	.string "facilities.\p"
	.string "Please take this, too.$"

RustboroCity_Gym_Text_ExplainTM:
	.string "That TM contains IRON TAIL.\n"
	.string "A steel tail whip. Hits hard.\l"
	.string "Does what it says on the tin.$"

@ -- Anvil post-battle conspiracy scene --

RustboroCity_Gym_Text_AnvilConspiracy1:
	.string "Kid. Can I ask you something\n"
	.string "off the record?\p"
	.string "The BUREAU has been increasing power\n"
	.string "output demands every quarter.\p"
	.string "The STEEL MILL cannot keep up.\n"
	.string "They keep saying they have\l"
	.string "“new sources” of energy but will\l"
	.string "not tell me what.$"

RustboroCity_Gym_Text_AnvilConspiracy2:
	.string "If you make it to MT. SPITE,\n"
	.string "and I think you will, look into\l"
	.string "what they are doing there.\p"
	.string "I cannot. I am the mayor.\n"
	.string "I am compromised.\p"
	.string "But you are just a kid with a badge.\n"
	.string "Nobody watches the kids.$"

RustboroCity_Gym_Text_AnvilConspiracy3:
	.string "Forget I said anything.\p"
	.string "Good luck out there.\n"
	.string "Get some sleep.\p"
	.string "One of us should.$"

RustboroCity_Gym_Text_AnvilPostBattle:
	.string "You have the FORGE BADGE.\n"
	.string "The north route leads to\l"
	.string "THE UNDERLAKE.\p"
	.string "Be careful down there.\n"
	.string "The readings are unstable.$"

@ -- Gym Statues --

RustboroCity_Gym_Text_GymStatue:
	.string "FERRO CITY POKéMON GYM$"

RustboroCity_Gym_Text_GymStatueCertified:
	.string "FERRO CITY POKéMON GYM\p"
	.string "ANVIL ’S CERTIFIED TRAINERS:\n"
	.string "{PLAYER}$"
