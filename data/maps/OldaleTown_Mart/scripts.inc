OldaleTown_Mart_MapScripts::
	.byte 0

OldaleTown_Mart_EventScript_Clerk::
	lock
	faceplayer
	message gText_HowMayIServeYou
	waitmessage
	goto_if_set FLAG_ADVENTURE_STARTED, OldaleTown_Mart_ExpandedItems
	pokemart OldaleTown_Mart_Pokemart_Basic
	msgbox gText_PleaseComeAgain, MSGBOX_DEFAULT
	release
	end

	.align 2
OldaleTown_Mart_Pokemart_Basic:
	.2byte ITEM_POTION
	.2byte ITEM_ANTIDOTE
	.2byte ITEM_PARALYZE_HEAL
	.2byte ITEM_AWAKENING
	pokemartlistend

OldaleTown_Mart_ExpandedItems::
	pokemart OldaleTown_Mart_Pokemart_Expanded
	msgbox gText_PleaseComeAgain, MSGBOX_DEFAULT
	release
	end

	.align 2
OldaleTown_Mart_Pokemart_Expanded:
	.2byte ITEM_POKE_BALL
	.2byte ITEM_POTION
	.2byte ITEM_ANTIDOTE
	.2byte ITEM_PARALYZE_HEAL
	.2byte ITEM_AWAKENING
	pokemartlistend

OldaleTown_Mart_EventScript_Woman::
	lock
	faceplayer
	goto_if_set FLAG_ADVENTURE_STARTED, OldaleTown_Mart_EventScript_PokeBallsInStock
	msgbox OldaleTown_Mart_Text_PokeBallsAreSoldOut, MSGBOX_DEFAULT
	release
	end

OldaleTown_Mart_EventScript_PokeBallsInStock::
	msgbox OldaleTown_Mart_Text_ImGoingToBuyPokeBalls, MSGBOX_DEFAULT
	release
	end

OldaleTown_Mart_EventScript_Boy::
	msgbox OldaleTown_Mart_Text_RestoreHPWithPotion, MSGBOX_NPC
	end

OldaleTown_Mart_Text_PokeBallsAreSoldOut:
	.string "Supply chain issues. The BUREAU\n"
	.string "redirected our POKé BALL shipment\l"
	.string "to some facility up north.\p"
	.string "They said it was “urgent.”\n"
	.string "Everything they do is urgent.$"

OldaleTown_Mart_Text_ImGoingToBuyPokeBalls:
	.string "POKé BALLS are back in stock!\n"
	.string "The BUREAU released the shipment\l"
	.string "after MAYOR ANVIL filed a complaint.\p"
	.string "The complaint was three pages.\n"
	.string "The first page was just the word\l"
	.string "“PLEASE.”$"

OldaleTown_Mart_Text_RestoreHPWithPotion:
	.string "Stock up on POTIONS before heading\n"
	.string "to THE UNDERLAKE. That cave is no\l"
	.string "joke.\p"
	.string "The RESONANCE ENERGY readings down\n"
	.string "there are all over the place.\l"
	.string "Makes the POKéMON twitchy.$"

