OldaleTown_PokemonCenter_1F_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, OldaleTown_PokemonCenter_1F_OnTransition
	map_script MAP_SCRIPT_ON_RESUME, CableClub_OnResume
	.byte 0

OldaleTown_PokemonCenter_1F_OnTransition:
	setrespawn HEAL_LOCATION_OLDALE_TOWN
	call Common_EventScript_UpdateBrineyLocation
	end

OldaleTown_PokemonCenter_1F_EventScript_Nurse::
	setvar VAR_0x800B, LOCALID_OLDALE_NURSE
	call Common_EventScript_PkmnCenterNurse
	waitmessage
	waitbuttonpress
	release
	end

OldaleTown_PokemonCenter_1F_EventScript_Gentleman::
	msgbox OldaleTown_PokemonCenter_1F_Text_TrainersCanUsePC, MSGBOX_NPC
	end

OldaleTown_PokemonCenter_1F_EventScript_Boy::
	msgbox OldaleTown_PokemonCenter_1F_Text_PokemonCentersAreGreat, MSGBOX_NPC
	end

OldaleTown_PokemonCenter_1F_EventScript_Girl::
	lock
	faceplayer
	goto_if_set FLAG_SYS_POKEDEX_GET, OldaleTown_PokemonCenter_1F_EventScript_WirelessClubAvailable
	msgbox OldaleTown_PokemonCenter_1F_Text_WirelessClubNotAvailable, MSGBOX_DEFAULT
	release
	end

OldaleTown_PokemonCenter_1F_EventScript_WirelessClubAvailable::
	msgbox OldaleTown_PokemonCenter_1F_Text_TradedInWirelessClub, MSGBOX_DEFAULT
	release
	end

OldaleTown_PokemonCenter_1F_Text_TrainersCanUsePC:
	.string "The BUREAU covers all healing costs.\n"
	.string "Unlimited visits. No co-pays.\p"
	.string "They say healthy POKéMON produce\n"
	.string "better RESONANCE ENERGY readings.\p"
	.string "Meanwhile humans in this city\n"
	.string "do not even have a dentist.$"

OldaleTown_PokemonCenter_1F_Text_PokemonCentersAreGreat:
	.string "The STEEL MILL runs day and night.\n"
	.string "You can hear it from here.\p"
	.string "That humming is not the lights.\n"
	.string "That is the RESONANCE CONDUITS\l"
	.string "in the walls.\p"
	.string "You get used to it.\n"
	.string "Or you go a little deaf. Either way.$"

OldaleTown_PokemonCenter_1F_Text_WirelessClubNotAvailable:
	.string "The WIRELESS CLUB upstairs lets you\n"
	.string "teleport POKéMON across dimensions.\p"
	.string "It's under construction though.\n"
	.string "Last guy who used it early got his\l"
	.string "PIKACHU fused with a MAILBOX.$"

OldaleTown_PokemonCenter_1F_Text_TradedInWirelessClub:
	.string "I traded my POKéMON wirelessly!\n"
	.string "Just beamed it across the void!\p"
	.string "It screamed the whole time but\n"
	.string "arrived perfectly fine! Science!$"

