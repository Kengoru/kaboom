import { useState, useEffect } from "react"

import SelectGrid, { SelectGridBox } from "../SelectGrid";

import {FiSend} from "react-icons/fi"

function PlayerSelectMenu({ players, onSelect = (selectedPlayerIds) => { }, titleElement, preSelectedPlayers = [], color }) {

    const [selectedArray, setSelectedArray] = useState([...preSelectedPlayers])




    function onSelect(id) {
        if (!selectedArray?.includes(id)) { // add 
            setSelectedArray([...selectedArray, id])
        } else {
            const newArray = selectedArray.filter(e => e !== id);
            setSelectedArray(newArray);
        }
    }

    return (
        <div className="w-full max-w-[36rem] h-full flex flex-col justify-start items-center overflow-hidden bg-base-100 rounded-lg p-4">
            <div className="w-[100vw]"></div>
            <div className="w-full flex items-center justify-center text-base-content text-xl font-extrabold mb-3">
                {titleElement}
            </div>
            <SelectGrid className={"h-fit max-h-[16rem] overflow-y-scroll overflow-x-hidden scrollbar-hide"}>
                {players.map(player => <SelectGridBox color={color} key={player?.id} onClick={() => onSelect(player?.id)} selected={(selectedArray?.includes(player?.id))}>
                    {player?.name}
                </SelectGridBox>)}
                
                
            </SelectGrid>
            <div className="w-full flex items-center flex-row-reverse justify-start">
                <button onClick={() => onSelect(selectedArray)} style={{backgroundColor: color, borderColor: color}} className={" btn noskew w-full mt-3 transition-all text-white " + (selectedArray?.length <=0 ? " opacity-50 " : " opacity-100 clickable ")}>REVEAL <FiSend className=" -rotate-45 ml-2 noskew"/> </button>

            </div>
        </div>
    );
}

export default PlayerSelectMenu;