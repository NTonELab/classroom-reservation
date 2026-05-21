'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SHA256 from 'crypto-js/sha256'

const periods = [
  '1교시',
  '2교시',
  '3교시',
  '4교시',
  '5교시',
  '6교시',
  '7교시',
  '8교시',
  '야1',
  '야2',
  '야3',
]

export default function Home() {

  const [spaces, setSpaces] = useState<any[]>([])
  const [reservations, setReservations] =
    useState<any[]>([])
  const [timetable, setTimetable] =
    useState<any[]>([])

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [password, setPassword] = useState('')

  const [selectedSpace, setSelectedSpace] =
    useState('')

  const [viewSpace, setViewSpace] =
    useState('컴퓨터실')

  const today = new Date()
    .toISOString()
    .split('T')[0]

  const [date, setDate] = useState(today)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [isEndTimeEdited, setIsEndTimeEdited] =
    useState(false)

  // 예약 삭제
  const [deleteModal, setDeleteModal] =
    useState(false)

  const [deleteName, setDeleteName] =
    useState('')

  const [deletePassword,
    setDeletePassword] =
    useState('')

  const [selectedReservation,
    setSelectedReservation] =
    useState<any>(null)

  // 관리자 삭제
  const [adminModal, setAdminModal] =
    useState(false)

  const [adminId,
    setAdminId] =
    useState('')

  const [adminPassword,
    setAdminPassword] =
    useState('')

  const [selectedLesson,
    setSelectedLesson] =
    useState<any>(null)

  useEffect(() => {

    fetchSpaces()
    fetchReservations()
    fetchTimetable()

  }, [viewSpace, date])

  async function fetchSpaces() {

    const { data } = await supabase
      .from('spaces')
      .select('*')

    setSpaces(data || [])
  }

  async function fetchReservations() {

    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('space_name', viewSpace)
      .eq('reservation_date', date)

    setReservations(data || [])
  }

  async function fetchTimetable() {

    const { data } = await supabase
      .from('timetable')
      .select('*')

    const formatted =
      (data || []).map((item) => ({

        ...item,

        lesson_date:
          item.lesson_date
            ? new Date(item.lesson_date)
                .toISOString()
                .split('T')[0]
            : null,

      }))

    setTimetable(formatted)
  }

  async function checkAdmin(
    inputId: string,
    inputPassword: string
  ) {

    const hashedPassword =
      SHA256(inputPassword).toString()

    const { data } = await supabase
      .from('admins')
      .select('*')
      .eq('admin_id', inputId)
      .eq('password', hashedPassword)
      .maybeSingle()

    return !!data
  }

  async function createReservation() {

    if (
      !name ||
      !subject ||
      !password ||
      !selectedSpace ||
      !date ||
      !startTime ||
      !endTime
    ) {

      alert('모든 항목을 입력하세요.')

      return
    }

    const startIndex =
      periods.indexOf(startTime)

    const endIndex =
      periods.indexOf(endTime)

    if (startIndex > endIndex) {

      alert(
        '종료 교시는 시작 교시보다 뒤여야 합니다.'
      )

      return
    }

    for (
      let i = startIndex;
      i <= endIndex;
      i++
    ) {

      const currentPeriod =
        periods[i]

      // 예약 검사
      const alreadyExists =
        reservations.find(
          (item) =>
            item.space_name === selectedSpace &&
            item.reservation_date === date &&
            item.start_time === currentPeriod
        )

      if (alreadyExists) {

        alert(
          `${currentPeriod}는 이미 예약되어 있습니다.`
        )

        return
      }

      // 정규수업 검사
      const lessonExists =
        timetable.find(
          (item) =>
            item.space_name === selectedSpace &&
            item.lesson_date === date &&
            item.period === currentPeriod
        )

      if (lessonExists) {

        alert(
          `${currentPeriod}는 정규수업 시간입니다.`
        )

        return
      }
    }

    const reservationData = []

    for (
      let i = startIndex;
      i <= endIndex;
      i++
    ) {

      reservationData.push({

        space_name: selectedSpace,

        user_name: name,

        subject: subject,

        password:
          SHA256(password).toString(),

        reservation_date: date,

        start_time: periods[i],

        end_time: periods[i],

      })
    }

    const { error } = await supabase
      .from('reservations')
      .insert(reservationData)

    if (error) {

      console.error(error)

      alert('예약 실패')

      return
    }

    alert('예약 완료')

    setViewSpace(selectedSpace)

    fetchReservations()

    setName('')
    setSubject('')
    setPassword('')

    setStartTime('')
    setEndTime('')

    setIsEndTimeEdited(false)
  }

  function getTimetable(period: string) {

    return timetable.find(
      (item) =>
        item.space_name === viewSpace &&
        item.lesson_date === date &&
        item.period === period
    )
  }

  function getReservation(period: string) {

    return reservations.find(
      (item) =>
        item.space_name === viewSpace &&
        item.reservation_date === date &&
        item.start_time === period
    )
  }

  function openDeleteModal(period: string) {

    const reservation =
      getReservation(period)

    if (!reservation) return

    setSelectedReservation(reservation)

    setDeleteName('')
    setDeletePassword('')

    setDeleteModal(true)
  }

  async function confirmDelete() {

  if (!selectedReservation) return

  // 관리자 검사
  const isAdmin =
    await checkAdmin(
      deleteName,
      deletePassword
    )

  // 사용자 검사
  const hashedPassword =
    SHA256(deletePassword).toString()

  const { data } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', selectedReservation.id)
    .maybeSingle()

  if (!data) {

    alert(
      '예약 정보를 찾을 수 없습니다.'
    )

    return
  }

  const isOwner =
    data.user_name === deleteName &&
    data.password === hashedPassword

  if (!isAdmin && !isOwner) {

    alert(
      '정보가 올바르지 않습니다.'
    )

    return
  }

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', selectedReservation.id)

  if (error) {

    alert('삭제 실패')

    return
  }

  alert('삭제 완료')

  setDeleteModal(false)

  fetchReservations()
}

  function deleteTimetable(
    period: string
  ) {

    const lesson =
      getTimetable(period)

    if (!lesson) return

    setSelectedLesson(lesson)

    setAdminId('')
    setAdminPassword('')

    setAdminModal(true)
  }

  async function confirmDeleteTimetable() {

    const isAdmin =
      await checkAdmin(
        adminId,
        adminPassword
      )

    if (!isAdmin) {

      alert('관리자 정보 오류')

      return
    }

    if (!selectedLesson) return

    const { error } = await supabase
      .from('timetable')
      .delete()
      .eq('id', selectedLesson.id)

    if (error) {

      alert('삭제 실패')

      return
    }

    alert('삭제 완료')

    setAdminModal(false)

    fetchTimetable()
  }

  return (

    <main className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold mb-8">
        디지털 교육공간 예약시스템
      </h1>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* 예약 입력 */}

        <div className="bg-white p-6 rounded-2xl shadow">

          <h2 className="text-2xl font-bold mb-4">
            예약 신청
          </h2>

          <div className="space-y-4">

            <input
              className="w-full border p-3 rounded-xl"
              placeholder="신청자 이름"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <input
              className="w-full border p-3 rounded-xl"
              placeholder="과목"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
            />

            <input
              type="password"
              className="w-full border p-3 rounded-xl"
              placeholder="예약 비밀번호"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <select
              className="w-full border p-3 rounded-xl"
              value={selectedSpace}
              onChange={(e) =>
                setSelectedSpace(e.target.value)
              }
            >

              <option value="">
                공간 선택
              </option>

              {spaces.map((space) => (

                <option
                  key={space.id}
                  value={space.name}
                >
                  {space.name}
                </option>

              ))}

            </select>

            <input
              type="date"
              className="w-full border p-3 rounded-xl"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
            />

            <select
              className="w-full border p-3 rounded-xl"
              value={startTime}
              onChange={(e) => {

                const value =
                  e.target.value

                if (!isEndTimeEdited) {
                  setEndTime(value)
                }

                setStartTime(value)
              }}
            >

              <option value="">
                시작 교시 선택
              </option>

              {periods.map((period) => (

                <option
                  key={period}
                  value={period}
                >
                  {period}
                </option>

              ))}

            </select>

            <select
              className="w-full border p-3 rounded-xl"
              value={endTime}
              onChange={(e) => {

                setEndTime(e.target.value)

                setIsEndTimeEdited(true)
              }}
            >

              <option value="">
                종료 교시 선택
              </option>

              {periods.map((period) => (

                <option
                  key={period}
                  value={period}
                >
                  {period}
                </option>

              ))}

            </select>

            <button
              onClick={createReservation}
              className="w-full bg-black text-white p-3 rounded-xl"
            >
              예약하기
            </button>

          </div>

        </div>

        {/* 시간표 */}

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow">

          <div className="flex flex-col md:flex-row gap-4 mb-6">

            <input
              type="date"
              className="border p-3 rounded-xl"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
            />

            <select
              className="border p-3 rounded-xl"
              value={viewSpace}
              onChange={(e) =>
                setViewSpace(e.target.value)
              }
            >

              {spaces.map((space) => (

                <option
                  key={space.id}
                  value={space.name}
                >
                  {space.name}
                </option>

              ))}

            </select>

          </div>

          <h2 className="text-2xl font-bold mb-4">
            {viewSpace} 시간표 현황
          </h2>

          <p className="mb-4 text-gray-500">
            {date}
          </p>

          <table className="w-full border-collapse">

            <thead>

              <tr className="bg-gray-100">

                <th className="border p-3">
                  교시
                </th>

                <th className="border p-3">
                  기존 수업
                </th>

                <th className="border p-3">
                  예약 현황
                </th>

              </tr>

            </thead>

            <tbody>

              {periods.map((period) => {

                const lesson =
                  getTimetable(period)

                const reservation =
                  getReservation(period)

                return (

                  <tr key={period}>

                    <td className="border p-3 text-center font-bold">
                      {period}
                    </td>

                    <td className="border p-3 text-center">

                      {lesson ? (

                        <div
                          onClick={() =>
                            deleteTimetable(period)
                          }
                          className="bg-blue-100 p-3 rounded-xl cursor-pointer hover:bg-blue-200"
                        >

                          <p className="font-bold text-blue-900">
                            {lesson.subject}
                          </p>

                          <p className="text-sm text-blue-700">
                            {lesson.teacher}
                          </p>

                        </div>

                      ) : null}

                    </td>

                    <td className="border p-3">

                      {reservation ? (

                        <div
                          onClick={() =>
                            openDeleteModal(period)
                          }
                          className="bg-red-200 p-3 rounded-xl text-center cursor-pointer hover:bg-red-300"
                        >

                          <p className="font-bold text-red-800">
                            {reservation.subject}
                          </p>

                          <p className="text-sm">
                            {reservation.user_name}
                          </p>

                        </div>

                      ) : lesson ? (

                        <div className="bg-blue-100 p-3 rounded-xl text-center">

                          <p className="font-bold text-blue-800">
                            정규수업
                          </p>

                        </div>

                      ) : (

                        <div className="bg-green-100 p-3 rounded-xl text-center">

                          <p className="font-bold text-green-700">
                            예약 가능
                          </p>

                        </div>

                      )}

                    </td>

                  </tr>
                )
              })}

            </tbody>

          </table>

        </div>

      </div>

      {/* 예약 삭제 */}

      {deleteModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-2xl w-80 shadow-xl">

            <h2 className="text-2xl font-bold mb-4 text-center">
              예약 삭제
            </h2>

            <div className="space-y-4">

              <input
                className="w-full border p-3 rounded-xl"
                placeholder="이름"
                value={deleteName}
                onChange={(e) =>
                  setDeleteName(e.target.value)
                }
              />

              <input
                type="password"
                className="w-full border p-3 rounded-xl"
                placeholder="비밀번호"
                value={deletePassword}
                onChange={(e) =>
                  setDeletePassword(
                    e.target.value
                  )
                }
              />

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white p-3 rounded-xl"
                >
                  삭제
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal(false)
                  }
                  className="flex-1 bg-gray-300 p-3 rounded-xl"
                >
                  취소
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* 관리자 삭제 */}

      {adminModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-2xl w-80 shadow-xl">

            <h2 className="text-2xl font-bold mb-4 text-center">
              관리자 확인
            </h2>

            <div className="space-y-4">

              <input
                className="w-full border p-3 rounded-xl"
                placeholder="관리자 아이디"
                value={adminId}
                onChange={(e) =>
                  setAdminId(e.target.value)
                }
              />

              <input
                type="password"
                className="w-full border p-3 rounded-xl"
                placeholder="관리자 비밀번호"
                value={adminPassword}
                onChange={(e) =>
                  setAdminPassword(
                    e.target.value
                  )
                }
              />

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={
                    confirmDeleteTimetable
                  }
                  className="flex-1 bg-red-500 text-white p-3 rounded-xl"
                >
                  삭제
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAdminModal(false)
                  }
                  className="flex-1 bg-gray-300 p-3 rounded-xl"
                >
                  취소
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      <footer className="mt-16 text-center text-gray-500 text-sm">

        <p>
          운영자 : NTonE Computer Science Teacher
        </p>

        <p className="mt-1">
          © 창원과학고등학교 ALL RIGHTS RESERVED.
        </p>

      </footer>

    </main>
  )
}