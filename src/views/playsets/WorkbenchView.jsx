
import { useState, useContext, useCallback, useMemo, useEffect } from "react"

// icons
import { FaTools, FaBomb } from "react-icons/fa"
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { MdOutlineClose } from "react-icons/md"
import { RiSpeedUpFill } from "react-icons/ri"
import { GiSwordwoman } from "react-icons/gi"
import { TfiReload } from "react-icons/tfi"




import LinkedCardsContainer from "../../components/LinkedCardsContainer";
import { getAllCards, getCardFromId, getCardsForPlayset, getLinkedCardsPaired, getLinkedCardsPairedById } from "../../helpers/cards";
import { avgFromCards, getDifficultyDataFromValue } from "../../helpers/difficulty";
import { PageContext } from "../../components/PageContextProvider";
import CardInfoMenu from "../../components/menus/CardInfoMenu";
import { WorkbenchPlaysetArea } from "../../components/playsets/PlaysetAreas";
import Pill, { DifficultyPill } from "../../components/Pills";
import CardsFilter from "../../components/CardsFilter";
import PlaysetDisplay from "../../components/playsets/PlaysetDisplay";

import Picker from 'emoji-picker-react';
import { getPlaysetArea } from "../../helpers/playset-areas";
import RangeCounter from "../../components/RangeCounter";
import { CardFront } from "../../components/Card";
import { ToggleButton } from "../../components/menus/GameInfoMenu";
import Info from "../../components/Info";
import supabase from "../../supabase";
import toast from "react-hot-toast";
import { minimizePlayset } from "../../helpers/playsets";



const MIN = {
    primaries: 2,
    generalCards: 0,
    oddCard: 0,
    defaultCards: 2
}
const MAX = {
    primaries: 3,
    generalCards: 1000,
    oddCard: 1,
    defaultCards: 2
}



export default function WorkbenchView(props) {

    const { setMenu, setPageCover, devMode, user, showLoginMenu, smoothNavigate } = useContext(PageContext);

    const [primaries, setPrimaries] = useState([
        ["b001", "r001"]
    ])
    const [generalCards, setGeneralCards] = useState([
        ["b014", "r014"]
    ])
    const [oddCard, setOddCard] = useState("g008"); // nullable
    const [defaultCards, setDefaultCards] = useState([
        ["b000", "r000"]
    ])


    // Form 
    const [emoji, setEmoji] = useState("🎲");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [shuffle, setShuffle] = useState(true);
    const [minPlayers, setMinPlayers] = useState(6);
    const [maxPlayers, setMaxPlayers] = useState(30);
    const [buryOption, setBuryOption] = useState("auto");

    const [loading, setLoading] = useState(false);





    const allCardsInPlaysetInRowId = useMemo(() => {
        var allCardsIds = [];

        primaries.forEach(cardPair => {
            allCardsIds = [...allCardsIds, ...cardPair]
        })
        generalCards.forEach(cardPair => {
            allCardsIds = [...allCardsIds, ...cardPair]
        })
        defaultCards.forEach(cardPair => {
            allCardsIds = [...allCardsIds, ...cardPair]
        })
        if (oddCard) allCardsIds.push(oddCard);


        return allCardsIds
    }, [primaries, generalCards, oddCard, defaultCards])



    const playset = useMemo(() => ({
        name,
        description,
        players: `${minPlayers}-${maxPlayers}`,
        emoji,
        primaries: crackOpenPairs(primaries).map((cid) => getCardFromId(cid)),
        cards: crackOpenPairs(generalCards).map((cid) => getCardFromId(cid)),
        default_cards: crackOpenPairs(defaultCards).map((cid) => getCardFromId(cid)),
        odd_card: oddCard ? getCardFromId(oddCard) : null,
        shuffle: shuffle,
        no_bury: (buryOption === "never"),
        force_bury: (buryOption === "always"),
        difficulty: getDifficultyDataFromValue(avgFromCards(allCardsInPlaysetInRowId.map(cid => getCardFromId(cid))))?.difficulty
    }), [primaries, generalCards, oddCard, defaultCards, emoji, name, description, shuffle, minPlayers, maxPlayers, allCardsInPlaysetInRowId, buryOption])



    // events
    function onCardSetInfo(card) {
        setMenu(<CardInfoMenu card={card} color={card?.color} />)
    }


    // functions
    function crackOpenPairs(pairs) { // makes 1d array from 2d array
        var cracked = [];
        pairs.forEach(cardPair => {
            cracked = [...cracked, ...cardPair]
        })

        return cracked;
    }

    function removeAtIndex(arr, index) {
        return arr.filter((value, i) => i !== index);
    }






    // useCallback functions
    const publishPlayset = useCallback(async () => {
        if (loading) return
        if (!user) return showLoginMenu()

        const playsetCopy = minimizePlayset(playset)

        setLoading(true);

        // change playset cards to jsut be ids

        console.log(playsetCopy)

        const { data, error } = await supabase
            .from('playsets')
            .upsert([
                { ...playsetCopy, min_players: minPlayers, max_players: maxPlayers },
            ])
            .select()
            .single()


        console.log(data)

        if (data?.id) {
            toast.success("Published!")
            smoothNavigate(`/playsets/${data?.id}`)
        }
        else toast.error("Error while publishing")

        console.log(error)

        setLoading(false)



    }, [playset, user, minPlayers, maxPlayers, loading])







    // select
    function onPrimaryCardsClick(clickedIndex) {
        var primaryCards = getAllCards()?.filter(card => card?.primary && !allCardsInPlaysetInRowId.includes(card?.id));
        setPageCover({
            title: "Select primary",
            element: <CardsFilter paired showDifficulty onClick={(card) => promptCardInfoBeforeSelect(card, replaceOrAddCard)} filter={{ visibleCards: primaryCards.map(c => c?.id) }} />,
            onClose: () => setPageCover(null)
        })


        function replaceOrAddCard(card) {
            var cardsIdsPair = getLinkedCardsPaired(card)?.map(c => c?.id);

            if (clickedIndex !== undefined && clickedIndex !== null) { // replace at this index
                setPrimaries(primaries => {
                    primaries[clickedIndex] = cardsIdsPair;
                    return JSON.parse(JSON.stringify(primaries));
                })
            } else { // add new
                setPrimaries(primaries => {
                    return [...primaries, cardsIdsPair]
                });

            }
            setPageCover(null)
        }
    }

    function onGeneralCardsClick(clickedIndex) {
        var applicableCards = getAllCards()?.filter(card => !card?.primary);
        setPageCover({
            title: "General cards",
            element: <CardsFilter paired showDifficulty onClick={(card) => promptCardInfoBeforeSelect(card, replaceOrAddCard)} filter={{ visibleCards: applicableCards.map(c => c?.id) }} />,
            onClose: () => setPageCover(null)
        })


        function replaceOrAddCard(card) {
            var cardsIdsPair = getLinkedCardsPaired(card)?.map(c => c?.id);

            if (clickedIndex !== undefined && clickedIndex !== null) { // replace at this index
                setGeneralCards(generalCards => {
                    generalCards[clickedIndex] = cardsIdsPair;
                    return JSON.parse(JSON.stringify(generalCards));
                })
            } else { // add new
                setGeneralCards(generalCards => {
                    return [...generalCards, cardsIdsPair]
                });

            }
            setPageCover(null)
        }
    }

    function onOddCardClick() {
        var applicableCards = getAllCards()?.filter(card => !card?.primary && card?.links?.length <= 0 && !["red", "blue"].includes(card?.color_name));
        setPageCover({
            title: "Odd card",
            element: <CardsFilter paired showDifficulty onClick={(card) => promptCardInfoBeforeSelect(card, replaceOrAddCard)} filter={{ visibleCards: applicableCards.map(c => c?.id) }} />,
            onClose: () => setPageCover(null)
        })

        


        function replaceOrAddCard(card) {
            setOddCard(card?.id)
            setPageCover(null)
        }
    }

    function onDefaultCardsClick(clickedIndex) {
        var applicableCards = getAllCards()?.filter(card => !card?.primary && ((["red", "blue"].includes(card?.color_name)) || (card?.color_name === "yellow" && card?.links?.length === 1) || card?.id === "y000"));
        setPageCover({
            title: "Default cards",
            element: <CardsFilter paired showDifficulty onClick={(card) => promptCardInfoBeforeSelect(card, replaceOrAddCard)} filter={{ visibleCards: applicableCards.map(c => c?.id) }} />,
            onClose: () => setPageCover(null)
        })


        function replaceOrAddCard(card) {
            var cardsIdsPair = getLinkedCardsPaired(card)?.map(c => c?.id);

            if (clickedIndex !== undefined && clickedIndex !== null) { // replace at this index
                setDefaultCards(defaultCards => {
                    defaultCards[clickedIndex] = cardsIdsPair;
                    return JSON.parse(JSON.stringify(defaultCards));
                })
            } else { // add new
                setDefaultCards(defaultCards => {
                    return [...defaultCards, cardsIdsPair]
                });

            }
            setPageCover(null)
        }
    }


    function promptCardInfoBeforeSelect(card, replaceOrAddCard = () => {}) {
        setMenu(
            <CardInfoMenu card={card} color={card?.color} onSelect={() => handleSelect()} />
        )

        function handleSelect() {
            setMenu(null);
            replaceOrAddCard(card)
        }
    }



    return (
        <div className="flex flex-col md:flex-row w-full h-full overflow-x-hidden overflow-y-scroll scrollbar-hide ">


            <div className="w-full md:max-w-md xl:max-w-xl flex flex-col items-start justify-start grow border-neutral/10 border-b md:border-r">  {/* Left Bar With linked cards box */}


                <div className="shadow-xl shadow-base-100">
                    <TitleBar titleElement={
                        <>
                            <FaTools />
                            <h1>Workbench</h1>
                        </>
                    } />
                </div>
                <div className="w-full md:overflow-x-hidden md:overflow-y-scroll gap-4 p-4 md:pb-20 flex flex-col">


                    <WorkbenchPlaysetArea
                        areaId="primaries"
                        min={MIN.primaries}
                        max={MAX.primaries}
                        cardCount={crackOpenPairs(primaries)?.length || 0}
                        onAdd={() => onPrimaryCardsClick(null)}>

                        {primaries.map((cardsIds, i) => <WorkbenchLinkedCards
                            onX={() => setPrimaries(primaries => removeAtIndex(primaries, i))}
                            onClick={() => onPrimaryCardsClick(i)}
                            onInfo={onCardSetInfo}
                            key={"primary-" + i + cardsIds?.[0]?.id} id={cardsIds[0]} />)}

                    </WorkbenchPlaysetArea>

                    <WorkbenchPlaysetArea
                        areaId="general"
                        min={MIN.generalCards}
                        max={MAX.generalCards}
                        cardCount={crackOpenPairs(generalCards)?.length || 0}
                        onAdd={() => onGeneralCardsClick(null)}>

                        {generalCards.map((cardsIds, i) => <WorkbenchLinkedCards
                            onX={() => setGeneralCards(generalCards => removeAtIndex(generalCards, i))}
                            onClick={() => onGeneralCardsClick(i)}
                            onInfo={onCardSetInfo}
                            key={"general-" + i + cardsIds?.[0]?.id}
                            id={cardsIds[0]} />)}

                    </WorkbenchPlaysetArea>

                    <WorkbenchPlaysetArea
                        areaId="odd"
                        min={MIN.oddCard}
                        max={MAX.oddCard}
                        cardCount={oddCard ? 1 : 0}
                        onAdd={() => onOddCardClick()}>

                        {oddCard && <WorkbenchLinkedCards
                            onX={() => setOddCard(null)}
                            onClick={() => onOddCardClick()}
                            onInfo={onCardSetInfo}
                            key={"odd-card"}
                            id={oddCard} />}

                    </WorkbenchPlaysetArea>

                    <WorkbenchPlaysetArea
                        areaId="default"
                        min={MIN.defaultCards}
                        max={MAX.defaultCards}
                        cardCount={crackOpenPairs(defaultCards)?.length || 0}
                        onAdd={() => onDefaultCardsClick()} >

                        {defaultCards.map((cardsIds, i) => <WorkbenchLinkedCards
                            onX={() => setDefaultCards(defaultCards => removeAtIndex(defaultCards, i))}
                            onClick={() => onDefaultCardsClick(i)}
                            onInfo={onCardSetInfo}
                            key={"general-" + i + cardsIds?.[0]?.id}
                            id={cardsIds[0]} />)}

                    </WorkbenchPlaysetArea>


                </div>



            </div>




            <div className="p-4 grow md:overflow-x-hidden md:overflow-y-scroll scrollbar-hide gap-4 flex flex-col items-center">
                <div className="w-full h-fit">
                    <PlaysetDisplay key={playset?.name} playset={playset} forceOpen />

                </div>
                <div className="flex flex-col w-full items-center gap-2">
                    <div className="w-full flex items-center gap-2 text-center">
                        <div className="dropdown input border-2 p-0 rounded-md">
                            <label tabIndex={0} className="w-16 h-full flex items-center justify-center">{playset?.emoji}</label>
                            <div tabIndex={0} className="dropdown-content">
                                <Picker onEmojiClick={(data) => setEmoji(data?.emoji || "🎲")} emojiStyle="native" categories={["smileys_people", "animals_nature", "food_drink", "travel_places", "activities", "objects", "symbols"]} />
                            </div>
                        </div>
                        <input type="text" placeholder="Name *" className="input border-2 w-full rounded-md" value={name} onChange={(e) => setName(e?.target?.value || "")} />
                    </div>
                    <div className="w-full -mb-1.5">
                        <textarea name="" onChange={(e) => setDescription(e?.target?.value || "")} value={description} className="textarea w-full border-2 border-neutral " rows="3" placeholder="Description" id="" cols="30"></textarea>
                    </div>
                    <div className="w-full">
                        <ToggleButton full checked={!shuffle} onChange={() => setShuffle(shuffle => !shuffle)} recommended={false}>
                            Distribute cards in order <Info tooltip="Click me!" href={""} />
                        </ToggleButton>
                    </div>
                    <div className="flex items-center justify-between w-full">
                        <h3 className="font-bold">
                            Player range:
                        </h3>
                        <div className="flex items-center gap-2">
                            <RangeCounter value={minPlayers} onChange={setMinPlayers} min={6} max={maxPlayers} />
                            <p>-</p>
                            <RangeCounter value={maxPlayers} onChange={setMaxPlayers} min={minPlayers <= 6 ? 6 : minPlayers} max={1000} />

                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full">
                        <h3 className="font-bold">
                            Burying:
                        </h3>
                        <select onChange={(e) => setBuryOption(e?.target?.value || "auto")} className="select select-bordered w-fit border-2 border-neutral">
                            <option value="auto" selected={buryOption === "auto"}>Auto</option>
                            <option value="always" selected={buryOption === "always"}>Always bury</option>
                            <option value="never" selected={buryOption === "never"}>Never bury</option>
                        </select>
                    </div>
                    <button className="btn btn-success w-full text-title text-base-100 noskew" onClick={() => publishPlayset()}>{loading ? <div className="loading loading-spinner text-white" /> : "Publish playset!"}</button>


                </div>
                <PlaysetSimulator playset={playset} buryOption={buryOption} />
                {devMode && false && <textarea rows={10} value={JSON.stringify(playset)} className="textarea w-full border-2 border-neural" />}
                <div className="py-12" />
            </div>

        </div>
    );
}




export function PlaysetSimulator({ playset, buryOption = "auto" }) {

    const [playerCount, setPlayerCount] = useState(11);
    const [playWithBury, setPlayWithBury] = useState(false);

    const [reloading, setReloading] = useState(false);

    const [reloader, setRealoader] = useState([])

    const { cards, soberCard } = useMemo(() => {
        setReloading(true);
        setTimeout(() => setReloading(false), 500)
        return getCardsForPlayset({ playset, players: Array(playerCount).fill(0), playWithBury })
    }, [playset, playerCount, playWithBury, reloader])


    const cardsPlusSober = useMemo(() => ([...cards, soberCard]), [cards, soberCard])

    

    const buriedCard = useMemo(() => {
        return (playWithBury ? cards[playerCount] || null : null)
    }, [cards, soberCard, playerCount, playWithBury])



    const recommendBury = useMemo(() => {
        return ((playset?.odd_card && playset?.odd_card?.id !== "drunk" ? false : ((playset?.cards.filter(c => c?.id !== "p001")?.length + (playset?.odd_card ? 1 : 0)) % 2) !== (playerCount % 2)))
    }, [playset, playerCount])


    useEffect(() => {
        setPlayWithBury(recommendBury)
    }, [recommendBury])
    



    function reload() {
        setRealoader([])
    }




    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div className="font-extrabold w-full text-lg mt-4 text-center border-b border-neutral/30 pb-2 relative">
                <p>Simulate Playset</p>
                <div className=" absolute top-0 right-0 bottom-0 flex items-center">
                    <button onClick={() => reload()} className={"clickable rounded-full w-9 h-9 flex items-center justify-center " + (reloading ? " animate-spin " : " animate-none ")}><TfiReload style={{ transform: "scaleY(-1)" }} size={20} /></button>
                </div>
            </div>
            <div className="flex flex-col items-center w-full gap-2">
                <div className="flex items-center w-full justify-between gap-2 text-lg">
                    <h3 className="font-semibold">Players</h3>
                    <RangeCounter value={playerCount} onChange={setPlayerCount} min={6} max={1000} />
                </div>
                <div className="flex items-center w-full justify-between gap-2 text-lg">
                    <ToggleButton disabled={buryOption !== "auto"} full checked={(playWithBury || playset?.force_bury || recommendBury) && !playset?.no_bury} onChange={() => setPlayWithBury(playWithBury => !playWithBury)} recommended={false || recommendBury}>
                        Play with bury
                    </ToggleButton>
                </div>
            </div>
            <div className="w-full flex-wrap flex border-2 border-neutral rounded-xl gap-2 p-2">

                {playset?.primaries?.map((card, i) => <ShuffledInCardDummy disabled={!cardsPlusSober?.includes(card?.id)} key={card?.id + i} card={card} areaId="primaries" />)}
                {playset?.cards?.map((card, i) => <ShuffledInCardDummy disabled={!cardsPlusSober?.includes(card?.id)} key={card?.id + i} card={card} areaId="general" />)}
                {playset?.odd_card && <ShuffledInCardDummy disabled={!cardsPlusSober?.includes(playset?.odd_card?.id)} key={playset?.odd_card?.id} card={playset?.odd_card} areaId="odd" />}
                {playset?.default_cards?.map((card, i) => <ShuffledInCardDummy disabled={(cardsPlusSober?.filter(c => card?.id === c)?.length - (playset?.cards?.filter(cs => cs?.id === card?.id)?.length)) < 1} key={card?.id + i} card={card} areaId="default">
                    {(cardsPlusSober?.filter(c => card?.id === c)?.length - (playset?.cards?.filter(cs => (cs?.id || cs) === card?.id)?.length)) > 1 && <ActionCircle inverted icon={<p className="font-extrabold">{(cards?.filter(c => card?.id === c)?.length - (playset?.cards?.filter(cs => (cs?.id || cs) === card?.id)?.length))}</p>} />}
                </ShuffledInCardDummy>)}
            </div>
            <p className="w-full text-sm -mt-4">Cards in game: {cards?.length}</p>
            <div className="grid grid-cols-2 gap-2 w-full">
                {buriedCard && <div className="flex flex-col w-full items-center justify-center gap-2 text-lg font-bold">
                    <h3 className="truncate">Buried card:</h3>
                    <div className='card relative scale-[25%] -mx-24  -my-36 '><CardFront card={getCardFromId(buriedCard)} color={getCardFromId(buriedCard)?.color} /></div>
                </div>}
                {soberCard && <div className="flex flex-col w-full items-center justify-center gap-2 text-lg font-bold">
                    <h3 className="truncate">Sober card:</h3>
                    <div className='card relative scale-[25%] -mx-24  -my-36 '><CardFront card={getCardFromId(soberCard)} color={getCardFromId(soberCard)?.color} /></div>
                </div>}
            </div>
        </div>
    )
}


// Simulator components

export function ShuffledInCardDummy({ card, areaId, disabled = false, children }) {
    const area = useMemo(() => getPlaysetArea(areaId || "odd"), [areaId]);

    return (
        <div className={"bg-black rounded-md overflow-hidden w-fit h-fit transition-all group " + (disabled ? " scale-75 " : " scale-100 ")}>
            <div style={{ backgroundColor: card?.color?.primary }} className={"text-white flex items-center justify-center flex-col relative aspect-[2/3] w-10 transition-all " + (disabled ? " opacity-50 " : " opacity-100 ")}>
                <area.icon className="opacity-0 group-hover:opacity-100 transition-all" />
                {card?.src && card?.src !== "" && <img src={`/cards${card.src}`} className="opacity-100 group-hover:opacity-0 transition-all absolute inset-0" />}
                <div className="opacity-100 group-hover:opacity-0 transition-all absolute inset-0 flex flex-col items-center justify-center">
                    {children}
                </div>
            </div>
        </div>

    )
}





// End Simulator Components


export function WorkbenchLinkedCards({ id, onInfo = (card) => { }, onClick = () => { }, onX = () => { } }) {

    const cards = useMemo(() => getLinkedCardsPairedById(id), [id])
    const averageDifficulty = useMemo(() => avgFromCards(cards), [cards])
    // const difficultyData = getDifficultyDataFromValue(averageDifficulty)

    return (
        <div className="flex flex-col items-start justify-start w-full h-fit gap-1">
            <div className="flex items-center justify-start h-36 w-full">
                <LinkedCardsContainer cards={cards} onClick={onClick} />
                <div className="w-12 p-2 h-full flex flex-col items-center justify-center">
                    <ActionCircle onClick={() => onX()} icon={<MdOutlineClose />} />
                    <ActionCircle onClick={() => onInfo(cards[0])} icon={<AiOutlineInfoCircle />} />
                </div>
            </div>
            <div className="overflow-x-scroll scrollbar-hide flex items-center">
                {/* {difficultyData && <Pill Icon={GiSwordwoman} bgColor={difficultyData?.colors?.secondary} textColor={difficultyData?.colors?.primary} tooltip={difficultyData?.difficulty}>{difficultyData?.name}</Pill>} */}
                <DifficultyPill difficulty={averageDifficulty} />
            </div>
        </div>
    )
}



export function ActionCircle({ onClick, icon, tooltip, hidden = false, inverted = false }) {
    return (
        <div onClick={onClick} className={" rounded-full  flex items-center justify-center  clickable " + (tooltip && " tooltip ") + (hidden ? " h-0 w-0 my-0 " : " h-8 w-8 my-1 ") + (inverted ? " text-base-content bg-base-100 " : " text-neutral-content bg-neutral ")} data-tip={tooltip}>
            {icon}
        </div>
    )
}


export function TitleBar({ titleElement, fixed }) {
    const { smoothNavigate } = useContext(PageContext);

    return (
        <div className={"flex items-center h-14 p-4 z-10 justify-start w-full text-xl md:text-2xl font-extrabold text-title transition-all " + (fixed && " fixed top-0 left-0 right-0 ")}>
            <button onClick={() => smoothNavigate("/")} className="flex items-center justify-end text-primary mr-4 h-full cursor-pointer">
                <FaBomb className="mr-4 sm:hidden block" size={25} />
                <h1 className="hidden sm:inline-block pr-4 ">KABOOM</h1>
                <VerticalDivider />
            </button>
            <div className="flex items-center justify-start gap-3 text-secondary">
                {titleElement}
            </div>
        </div>
    )



}


export function VerticalDivider() {
    return (
        <div className="h-full p-[1px] rounded-full bg-neutral/20" />
    )
}






