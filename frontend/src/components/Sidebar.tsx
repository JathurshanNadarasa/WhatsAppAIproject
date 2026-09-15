"use client";

interface SidebarProps {
    activePage: string;
    setActivePage: (
        page: string
    ) => void;
}

export default function Sidebar({
    activePage,
    setActivePage,
}: SidebarProps) {

    const menuItems = [
        {
            name: "Dashboard",
            value: "dashboard",
        },
        {
            name: "Customers",
            value: "customers",
        },
        {
            name: "Conversations",
            value: "conversations",
        },
    ];

    return (
        <aside className="min-h-screen w-64 border-r bg-white p-5">

            <h1 className="mb-8 text-xl font-bold">
                Nexora
            </h1>

            <nav className="space-y-2">

                {menuItems.map((item) => (

                    <button
                        key={item.value}
                        onClick={() =>
                            setActivePage(
                                item.value
                            )
                        }
                        className={`w-full rounded-lg px-4 py-3 text-left ${
                            activePage === item.value
                                ? "bg-black text-white"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        {item.name}
                    </button>

                ))}

            </nav>

        </aside>
    );
}