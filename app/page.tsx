import Link from 'next/link'

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                <h1 className="text-4xl font-bold text-orange-500">POSMARS</h1>
                <p className="text-xl">Creative Tech Service Master Plan</p>

                <div className="flex gap-4">
                    <Link href="/admin" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200">
                        Go to Master Hub (Admin)
                    </Link>
                    <a href="#" className="border border-white px-6 py-3 rounded-full hover:bg-white/10">
                        Learn More
                    </a>
                </div>
            </main>
        </div>
    );
}
