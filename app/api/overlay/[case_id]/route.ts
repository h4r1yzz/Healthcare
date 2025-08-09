import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ case_id: string }> }
) {
  try {
    const { case_id } = await params
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || '96'
    
    // Forward the request to the FastAPI backend
    const backendUrl = `http://localhost:8000/overlay/${case_id}?size=${size}`
    const response = await fetch(backendUrl)
    
    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse('Overlay image not found', { status: 404 })
      }
      throw new Error(`Backend responded with status ${response.status}`)
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    
    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename=overlay_${case_id}_${size}x${size}.png`
      },
    })
  } catch (error) {
    console.error('Overlay API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
