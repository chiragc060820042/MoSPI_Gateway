// Add researcherNavigation for researcher/admin roles
const researcherNavigation = [
  // Example: { name: 'Query Builder', href: '/query', icon: DocumentTextIcon },
  // Add more researcher tools here if needed
];
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  ClockIcon,
  UserIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Surveys', href: '/surveys', icon: ChartBarIcon },
  { name: 'Query Builder', href: '/query', icon: DocumentTextIcon },
  { name: 'Query History', href: '/history', icon: ClockIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: CogIcon },
];

function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as="div" // <-- Change from Fragment to "div"
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as="div" // <-- Change from Fragment to "div"
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <span className="ml-2 text-xl font-semibold text-gray-900">MoSPI Gateway</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                                  ${location.pathname === item.href
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                  }
                                `}
                                onClick={onClose}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 ${
                                    location.pathname === item.href ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                                  }`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                      {user?.role === 'admin' && (
                        <li>
                          <div className="text-xs font-semibold leading-6 text-gray-400">Admin</div>
                          <ul role="list" className="-mx-2 mt-2 space-y-1">
                            {adminNavigation.map((item) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  className={`
                                    group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                                    ${location.pathname === item.href
                                      ? 'bg-primary-50 text-primary-600'
                                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                    }
                                  `}
                                  onClick={onClose}
                                >
                                  <item.icon
                                    className={`h-6 w-6 shrink-0 ${
                                      location.pathname === item.href ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900">MoSPI Gateway</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${location.pathname === item.href
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            location.pathname === item.href ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              {/* {(user?.role === 'researcher' || user?.role === 'admin') && (
                <li>
                  <div className="text-xs font-semibold leading-6 text-gray-400">Research Tools</div>
                  <ul role="list" className="-mx-2 mt-2 space-y-1">
                    {researcherNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                            ${location.pathname === item.href
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <item.icon
                            className={`h-6 w-6 shrink-0 ${
                              location.pathname === item.href ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                            }`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )} */}
              {user?.role === 'admin' && (
                <li>
                  <div className="text-xs font-semibold leading-6 text-gray-400">Admin</div>
                  <ul role="list" className="-mx-2 mt-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                            ${location.pathname === item.href
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <item.icon
                            className={`h-6 w-6 shrink-0 ${
                              location.pathname === item.href ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                            }`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
