import React from 'react'
import { IoIosArrowBack } from "react-icons/io";

export default function Header() {
  return (
    <header className='w-full h-16 bg-[#00027d] flex items-center pl-4'>
      <IoIosArrowBack className="text-white" size={30} />
    </header>
  )
}
