export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
      <div className="text-center p-8">
        <div className="w-24 h-24 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-light text-gray-800 mb-2">Privacy Chat for Web</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Send and receive messages privately. Start a completely secure session with anyone from your contacts.
        </p>
      </div>
    </div>
  )
}
