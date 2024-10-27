'use client'

import { ReactNode } from 'react'
import { StyleProvider } from '@ant-design/cssinjs'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'

import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export const AntdProvider = ({ children }: { children: ReactNode }) => (
  <AntdRegistry>
    <StyleProvider layer>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  </AntdRegistry>
)
