'use client'

import { useRef, useState } from 'react'
import { MP4Clip } from '@webav/av-cliper'
import { Button, Slider, Spin } from 'antd'

import { createGif, ImageWithDelay } from '@/lib/gif'

export default function Home() {
  const [isStart, setIsStart] = useState(false)
  const [url, setUrl] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [splitRange, setSplitRange] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  async function startVideo() {
    const stream = await navigator.mediaDevices
      .getDisplayMedia({
        video: true,
        audio: false,
      })
      .catch(e => {
        console.error(e)
      })
    // 判断 MediaRecorder 支持的文件类型
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=h264')
      ? 'video/webm;codecs=h264'
      : 'video/webm'
    if (!stream) {
      return
    }
    // mimeType 支持的类型，第二个 options 参数是可选项，第一个参数表示要记录的流
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mime,
    })
    const chunks: Blob[] = []

    mediaRecorder.addEventListener('dataavailable', function (e) {
      chunks.push(e.data)
    })

    mediaRecorder.addEventListener('stop', async () => {
      setIsStart(false)
      const blob = new Blob(chunks, { type: chunks[0].type })
      const url = URL.createObjectURL(blob)

      setUrl(url)
      setIsLoading(true)
    })
    // 开始记录数据
    mediaRecorder.start()
  }

  const generateGif = async () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = splitRange[0]

    const duration = splitRange[1] - splitRange[0]

    const frameNum = Math.floor(duration * 24)

    console.log(frameNum, splitRange)

    const images: ImageWithDelay[] = []

    for (let i = 0; i < frameNum; i++) {
      console.log(splitRange[0] + i * (1 / 24))
      video.currentTime = splitRange[0] + i * (1 / 24)
      await new Promise(resolve => setTimeout(resolve, 1000 / 24))
      // 视频当前帧数据
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      context?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL()
      images.push({
        id: i.toString(),
        base64: imageData,
        delay: (1 / 24) * 1000,
      })
    }

    const ratio = 2
    const width = video.videoWidth
    const height = video.videoHeight
    const blob = await createGif({
      images: images,
      options: { quality: 50, width: width / ratio, height: height / ratio },
    })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
  }

  return (
    <div className="flex h-screen flex-col items-center gap-4 pt-10">
      <Button onClick={startVideo}>{isStart ? '停止录制' : '开始录制'}</Button>
      {url && (
        <Spin spinning={isLoading}>
          <div className="flex flex-col items-center gap-4">
            <video
              ref={videoRef}
              controls
              className="w-[800px]"
              src={url}
              onLoadedMetadata={() => {
                if (!videoRef.current) {
                  return
                }
                setIsLoading(false)
                const video = document.querySelector('video')!
                video.ontimeupdate = function () {
                  if (!video) {
                    return
                  }
                  video.ontimeupdate = null
                  video.currentTime = 0
                  const duration = video.duration
                  setIsLoading(false)
                  setDuration(duration || 0)
                  setSplitRange([0, duration || 0])
                }
                video.currentTime = 1e100
              }}
            />
            <div className="text-lg font-bold">切割片段</div>
            <Slider
              className="w-[calc(800px_-_40px)]"
              step={0.1}
              range
              min={0}
              max={duration}
              value={splitRange}
              onChange={value => {
                setSplitRange(value)
              }}
            />
            <Button onClick={generateGif}>生成GIF</Button>
          </div>
        </Spin>
      )}
      <img src={previewUrl} />
    </div>
  )
}
