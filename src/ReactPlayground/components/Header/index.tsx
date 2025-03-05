import logoSvg from "./icons/logo.svg";
export default function Header() {
	return (
		<div className=" h-14 px-5 box-border border-b border-black border-solid flex justify-between items-center">
			<div className="flex text-xl items-center">
				<img
					className=" h-6 ml-3"
					src={logoSvg}
					alt="logo"
				/>
				<span>React PlayGround</span>
			</div>
		</div>
	);
}
